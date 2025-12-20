// hooks/usePushNotifications.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../services/api";

type PushState = {
    token: string | null;
    loading: boolean;
    error: string | null;
};

export function usePushNotifications(): PushState {
    const { appReady, userToken } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 🔍 בדיקה 1: האם ההוק בכלל רץ?
        console.log("🔍 Hook started. Status:", { appReady, hasToken: !!userToken });

        if (!appReady || !userToken) {
            console.log("🛑 App not ready or no user token yet.");
            setToken(null);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            console.log("🚀 Starting registration process...");

            try {
                // קריאה לפונקציה שמשיגה את הטוקן
                const expoToken = await registerForPushNotificationsAsync();

                // 🔍 בדיקה 2: האם קיבלנו טוקן מהטלפון?
                console.log("📲 Token from device result:", expoToken);

                if (!expoToken) {
                    console.log("🛑 Registration failed - No token returned from register function.");
                    return;
                }

                if (!cancelled) {
                    setToken(expoToken);
                }

                // שמירת ה-token בשרת
                console.log("📡 Sending token to server via apiFetch...");
                try {
                    const res = await apiFetch("/users/me/push-token", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ expoPushToken: expoToken }),
                    });
                    console.log("✅ Server response:", res);
                } catch (err) {
                    console.error("❌ Failed to save push token on server (API Error):", err);
                }
            } catch (err: any) {
                console.error("❌ General Error in process:", err);
                if (!cancelled) {
                    setError(err?.message || "שגיאה בהרשמה לפושים");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [appReady, userToken]);

    return { token, loading, error };
}

// 👇 הפונקציה שעושה את העבודה מול המכשיר
async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log("Push notifications only work on a physical device");
        return null;
    }

    // ❌❌❌ מחקתי את הבדיקה של Expo Go מכאן כדי שלא תחסום אותך בטעות ב-Dev Build
    // if (Constants.appOwnership === "expo") { ... }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Permission for notifications not granted!");
        return null;
    }

    // משיכת ה-Project ID מהקונפיגורציה
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId as
        | string
        | undefined;

    let tokenData;

    try {
        if (projectId) {
            tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        } else {
            console.warn("No projectId found in app config, using fallback");
            tokenData = await Notifications.getExpoPushTokenAsync();
        }
        console.log("📲 Expo push token generated:", tokenData.data);
        return tokenData.data;

    } catch (e) {
        console.error("Error getting push token:", e);
        return null;
    }
}
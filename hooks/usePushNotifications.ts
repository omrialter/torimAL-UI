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
        // האפליקציה לא מוכנה / המשתמש לא מחובר
        if (!appReady || !userToken) {
            setToken(null);
            return;
        }

        // 👇 אם רצים בתוך Expo Go – לא מנסים בכלל להירשם לפושים
        if (Constants.appOwnership === "expo") {
            console.log(
                "Running inside Expo Go – skipping push registration (remote push requires a dev build)."
            );
            setToken(null);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);

            try {
                const expoToken = await registerForPushNotificationsAsync();

                if (!expoToken) {
                    if (!cancelled) {
                        // פה אפשר לא לשים שגיאה כדי לא לעצבן את המשתמש
                        console.log("No push token received");
                    }
                    return;
                }

                if (!cancelled) {
                    setToken(expoToken);
                }

                // שמירת ה-token בשרת
                try {
                    await apiFetch("/users/me/push-token", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ expoPushToken: expoToken }),
                    });
                } catch (err) {
                    console.log("failed to save push token on server:", err);
                }
            } catch (err: any) {
                console.log("push registration error:", err);
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

async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log("Push notifications only work on a physical device");
        return null;
    }

    // 🔒 שוב בדיקה ליתר ביטחון
    if (Constants.appOwnership === "expo") {
        console.log("Expo Go detected — aborting push registration.");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Permission for notifications not granted");
        return null;
    }

    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId as
        | string
        | undefined;

    let tokenData;

    if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } else {
        console.warn("No projectId found in app config, using fallback");
        tokenData = await Notifications.getExpoPushTokenAsync();
    }

    console.log("📲 Expo push token:", tokenData.data);
    return tokenData.data;
}

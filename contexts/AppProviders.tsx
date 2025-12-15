// providers/AppProviders.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import {
    BusinessDataProvider,
    useBusinessDataContext,
} from "../contexts/BusinessDataContext";
import { UserDataProvider } from "../contexts/UserDataContext";
import { usePushNotifications } from "../hooks/usePushNotifications";

type Props = {
    children: React.ReactNode;
};

function BusinessDataGate({ children }: { children: React.ReactNode }) {
    const { loading, error } = useBusinessDataContext();

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: "#ffffff",
                }}
            >
                {/* פה אפשר אחר כך לשים UI יותר יפה לשגיאה */}
            </View>
        );
    }

    return <>{children}</>;
}

// 👇 קומפוננטה קטנה שמפעילה את ה-hook של הפושים ברקע
function PushNotificationsInitializer() {
    const { token, error } = usePushNotifications();

    // לא חובה, אבל אפשר לדבג:
    if (token) {
        console.log("✅ Push token registered:", token);
    }
    if (error) {
        console.log("⚠️ Push notifications error:", error);
    }

    return null; // לא מציירת שום דבר במסך
}

export function AppProviders({ children }: Props) {
    return (
        <AuthProvider>
            <UserDataProvider>
                <BusinessDataProvider>
                    {/* מאתחל פושים ברגע שהמשתמש מחובר והאפליקציה מוכנה */}
                    <PushNotificationsInitializer />

                    <BusinessDataGate>{children}</BusinessDataGate>
                </BusinessDataProvider>
            </UserDataProvider>
        </AuthProvider>
    );
}

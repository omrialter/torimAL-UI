// contexts/AppProviders.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

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

// ----------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------

/**
 * קומפוננטת "שער" (Gate):
 * מונעת את טעינת המסכים הפנימיים עד שנתוני העסק (BusinessData) נטענו בהצלחה.
 */
function BusinessDataGate({ children }: { children: React.ReactNode }) {
    const { loading, error } = useBusinessDataContext();

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>שגיאה בטעינת נתוני העסק.</Text>
                <Text style={styles.errorText}>אנא נסה שנית מאוחר יותר.</Text>
            </View>
        );
    }

    return <>{children}</>;
}

/**
 * קומפוננטה "ראש" (Headless) לאתחול התראות פוש.
 * היא לא מרנדרת כלום, רק מפעילה את ה-Hook ברקע.
 */
function PushNotificationsInitializer() {
    usePushNotifications();
    // אם תרצה לדבג טוקנים בעתיד, אפשר להוסיף כאן לוגים זמניים
    return null;
}

// ----------------------------------------------------------------------
// Main Provider
// ----------------------------------------------------------------------

export function AppProviders({ children }: Props) {
    return (
        // 1. AuthProvider חייב להיות עליון כדי לספק טוקן לכולם
        <AuthProvider>
            {/* 2. UserData מספק מידע על המשתמש המחובר */}
            <UserDataProvider>
                {/* 3. BusinessData טוען את הגדרות העסק (צבעים, לוגו וכו') */}
                <BusinessDataProvider>

                    <PushNotificationsInitializer />

                    {/* ה-Gate מוודא שלא נציג UI לפני שיש לנו את הגדרות העסק */}
                    <BusinessDataGate>
                        {children}
                    </BusinessDataGate>

                </BusinessDataProvider>
            </UserDataProvider>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: "red",
        textAlign: "center",
        marginBottom: 8,
    },
});
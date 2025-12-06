// providers/AppProviders.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { BusinessDataProvider, useBusinessDataContext } from "../contexts/BusinessDataContext";
import { UserDataProvider } from "../contexts/UserDataContext";

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

export function AppProviders({ children }: Props) {
    return (
        <AuthProvider>
            <UserDataProvider>
                <BusinessDataProvider>
                    <BusinessDataGate>
                        {children}
                    </BusinessDataGate>
                </BusinessDataProvider>
            </UserDataProvider>
        </AuthProvider>
    );
}

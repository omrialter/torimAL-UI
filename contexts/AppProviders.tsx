// providers/AppProviders.tsx
import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { BusinessDataProvider } from "../contexts/BusinessDataContext";
import { UserDataProvider } from "../contexts/UserDataContext";

type Props = {
    children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
    return (
        <AuthProvider>
            <UserDataProvider>
                <BusinessDataProvider>
                    {children}
                </BusinessDataProvider>
            </UserDataProvider>
        </AuthProvider>
    );
}

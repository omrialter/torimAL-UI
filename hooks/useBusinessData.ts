// hooks/useBusinessData.ts
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../services/api";

// ----------------------------------------------------------------------
// Types & Defaults
// ----------------------------------------------------------------------

export type BusinessColors = {
    primary: string;
    secondary: string;
    third: string;
};

const DEFAULT_COLORS: BusinessColors = {
    primary: "#111",
    secondary: "#f3f4f6",
    third: "#fff",
};

// ----------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------

export function useBusinessData<T = any>() {
    // שליפת ה-ID מתוך הקונפיגורציה (app.json / app.config.js)
    const BUSINESS_ID = Constants.expoConfig?.extra?.BUSINESS_ID;

    const { appReady, userToken } = useAuth();

    const [businessData, setBusinessData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * טעינת נתוני העסק מהשרת
     */
    const fetchBusinessData = useCallback(async () => {
        if (!BUSINESS_ID) {
            console.warn("⚠️ useBusinessData: Missing BUSINESS_ID in app config");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // אין צורך לשרשר את URL, הפונקציה apiGet מטפלת בזה
            const data = await apiGet<T>(`/businesses/businessInfo/${BUSINESS_ID}`);

            if (data) {
                setBusinessData(data);
            }
        } catch (err: any) {
            setError("Failed to load business data");
        } finally {
            setLoading(false);
        }
    }, [BUSINESS_ID]);

    // טעינה אוטומטית כאשר האפליקציה מוכנה ויש משתמש מחובר
    useEffect(() => {
        if (!appReady) return;

        if (userToken) {
            void fetchBusinessData();
        } else {
            setBusinessData(null);
        }
    }, [appReady, userToken, fetchBusinessData]);

    const clear = useCallback(() => {
        setBusinessData(null);
        setError(null);
    }, []);

    // חילוץ הצבעים בצורה בטוחה עם Fallback
    const colors: BusinessColors = (businessData as any)?.business_colors || DEFAULT_COLORS;

    return {
        businessData,
        colors,
        loading,
        error,
        refetch: fetchBusinessData,
        clear,
    };
}
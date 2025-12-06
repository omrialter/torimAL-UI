import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { URL, apiGet } from "../services/api";

type BusinessData = Record<string, any>;

const DEFAULT_COLORS = {
    primary: "#111",
    secondary: "#f3f4f6",
    third: "#fff",
};

export function useBusinessData() {
    const BUSINESS_ID = Constants.expoConfig?.extra?.BUSINESS_ID;

    const { appReady, userToken } = useAuth();
    const [businessData, setBusinessData] = useState<BusinessData>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const doApiBusiness = useCallback(async () => {
        if (!BUSINESS_ID) {
            console.warn("useBusinessData: Missing BUSINESS_ID in app config");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await apiGet(
                `${URL}/businesses/businessInfo/` + BUSINESS_ID
            );

            console.log("useBusinessData: business from API:", data);

            setBusinessData(data);

            console.log(
                "useBusinessData: business data loaded, id:",
                BUSINESS_ID
            );
        } catch (err: any) {
            console.log("useBusinessData/doApiBusiness error:", err);
            setError("Failed to load business data");
        } finally {
            setLoading(false);
        }
    }, [BUSINESS_ID]);

    useEffect(() => {
        if (!appReady) return;

        if (userToken) {
            void doApiBusiness();
        } else {
            setBusinessData({});
        }
    }, [appReady, userToken, doApiBusiness]);

    const clear = () => {
        setBusinessData({});
        setError(null);
    };

    // 🎨 נשלוף את הצבעים מתוך הנתונים, או ניפול ל-default אם אין
    const colors =
        (businessData?.business_colors as
            | { primary: string; secondary: string; third: string }
            | undefined) || DEFAULT_COLORS;

    return {
        businessData,
        colors,
        loading,
        error,
        refetch: doApiBusiness,
        clear,
    };
}

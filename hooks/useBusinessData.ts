
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { URL, apiGet } from "../services/api"; // keep your existing service

type BusinessData = Record<string, any>;

export function useBusinessData() {
    const BUSINESS_ID = Constants.expoConfig?.extra?.BUSINESS_ID;

    const { appReady, userToken } = useAuth();
    const [businessData, setBusinessData] = useState<BusinessData>({});

    const doApiBusiness = useCallback(async () => {
        try {
            const data = await apiGet(`${URL}/businesses/businessInfo/` + BUSINESS_ID);
            setBusinessData(data);
        } catch (err) {
            console.log("useBusinessData/doApiUser error:", err);
        }
    }, []);

    useEffect(() => {
        if (!appReady) return;
        if (userToken) {
            void doApiBusiness();
            console.log("this messege is from the useBusinessData, the function worked we have the data");
        } else {
            setBusinessData({});
        }
    }, [appReady, userToken]);

    const clear = () => setBusinessData({});

    return { businessData, clear };

}
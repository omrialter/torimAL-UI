import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { URL, apiGet } from "../services/api"; // keep your existing service

type UserData = Record<string, any>;

export function useUserData() {
    const { appReady, userToken } = useAuth();
    const [userData, setUserData] = useState<UserData>({});


    const doApiUser = useCallback(async () => {
        try {
            const data = await apiGet(`${URL}/users/userInfo`);
            setUserData(data);
        } catch (err) {
            console.log("useUserData/doApiUser error:", err);
        }
    }, []);

    useEffect(() => {
        if (!appReady) return;
        if (userToken) {
            void doApiUser();
            console.log("this messege is from the useUserData, the function worked we have the data");
        } else {
            setUserData({});
        }
    }, [appReady, userToken]);

    const clear = () => setUserData({});

    return { userData, clear };
}

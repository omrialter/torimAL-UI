// hooks/useUserData.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../services/api";

export function useUserData<T = any>() {
    const { userToken } = useAuth();

    // שיניתי ל-null כערך התחלתי, קל יותר לבדוק אם המידע נטען
    const [userData, setUserData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * פונקציה לטעינת נתוני המשתמש מהשרת.
     * חשופה החוצה כדי לאפשר רענון ידני (Pull to Refresh).
     */
    const fetchUserData = useCallback(async () => {
        if (!userToken) return;

        setIsLoading(true);
        try {
            // אין צורך ב-${URL}, ה-apiGet מטפל בזה
            const data = await apiGet<T>("/users/userInfo");
            if (data) {
                setUserData(data);
            }
        } catch (err) {
            console.log("❌ useUserData error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [userToken]);

    // טעינה ראשונית כאשר הטוקן זמין
    useEffect(() => {
        if (userToken) {
            void fetchUserData();
        } else {
            setUserData(null);
        }
    }, [userToken, fetchUserData]);

    const clear = useCallback(() => setUserData(null), []);

    return {
        userData,
        isLoading,
        refetch: fetchUserData,
        clear
    };
}
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { onUnauthorized, setAuthToken, URL } from '../services/api';

type DecodedToken = { exp?: number; role?: string;[k: string]: any };

type AuthContextType = {
    userToken: string | null;
    isAdmin: boolean | null;   // null = לא ידוע עדיין
    adminReady: boolean;       // סיים בדיקת שרת
    appReady: boolean;         // סיים Bootstrap מה‑SecureStore
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const JWT_KEY = 'jwt';
const IS_ADMIN_KEY = 'is_admin';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [appReady, setAppReady] = useState(false);
    const [adminReady, setAdminReady] = useState(false);

    // מזהה טיימר ל"בקרה לפני פקיעה"
    const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Bootstrap: טוען טוקן ודגל אדמין מה‑SecureStore
    useEffect(() => {
        (async () => {
            const [token, cachedIsAdmin] = await Promise.all([
                SecureStore.getItemAsync(JWT_KEY),
                SecureStore.getItemAsync(IS_ADMIN_KEY),
            ]);

            if (token) {
                setUserToken(token);
                setAuthToken(token); // כל הקריאות דרך services/api יישאו את הטוקן
                console.log('🔐 Stored JWT token:', token);
            }

            if (cachedIsAdmin === 'true') setIsAdmin(true);
            else if (cachedIsAdmin === 'false') setIsAdmin(false);
            else setIsAdmin(null);

            setAppReady(true);
        })();
    }, []);

    // --- מאזין גלובלי ל-401 מהשכבת API
    useEffect(() => {
        const off = onUnauthorized(async () => {
            await logout(); // ניתוק נקי אם השרת מחזיר 401 בקריאה כלשהי
        });
        return off;
    }, []);

    // --- בדיקת טוקן + קביעת אדמין מהשרת
    const refreshAdmin = useCallback(async () => {
        if (!userToken) {
            setIsAdmin(null);
            setAdminReady(true);
            return;
        }

        try {
            const res = await fetch(`${URL}/users/checkToken`, {
                method: 'GET',
                headers: { 'x-api-key': userToken },
            });

            if (res.status === 401) {
                await logout(); // טוקן פג/לא תקין
                return;
            }

            // אם תבחר להחזיר 403 ל"לא אדמין" בצד שרת:
            if (res.status === 403) {
                setIsAdmin(false);
                await SecureStore.setItemAsync(IS_ADMIN_KEY, 'false');
                setAdminReady(true);
                return;
            }

            if (!res.ok) {
                setAdminReady(true); // שגיאת שרת/רשת — לא מפילים UX
                return;
            }

            const data = await res.json(); // { _id, role }
            const admin = data?.role === 'admin';
            setIsAdmin(admin);
            await SecureStore.setItemAsync(IS_ADMIN_KEY, admin ? 'true' : 'false');
            setAdminReady(true);
        } catch {
            setAdminReady(true); // שגיאת fetch — מתייחסים בעדינות
        }
    }, [userToken]);

    // --- תיזמון בדיקה מעט לפני פקיעת הטוקן (אם יש exp)
    useEffect(() => {
        if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
        }

        if (!userToken) return;

        try {
            const dec = jwtDecode<DecodedToken>(userToken);
            if (dec?.exp) {
                const msToExp = dec.exp * 1000 - Date.now();
                const wait = Math.max(msToExp - 60_000, 0); // דקה לפני
                expiryTimerRef.current = setTimeout(() => {
                    void refreshAdmin(); // השרת יחזיר 401 אם פג
                }, wait);
            }
        } catch {
            // אם הפענוח נכשל — עדיין יש לנו בדיקות אחרות
        }

        return () => {
            if (expiryTimerRef.current) {
                clearTimeout(expiryTimerRef.current);
                expiryTimerRef.current = null;
            }
        };
    }, [userToken, refreshAdmin]);

    // --- נרענן כש‑appReady מוכן או כש‑userToken משתנה
    useEffect(() => {
        if (!appReady) return;
        setAdminReady(false);
        void refreshAdmin();
    }, [appReady, userToken, refreshAdmin]);

    // --- Revalidate כשחוזרים ל‑foreground + כל 10 דק'
    useEffect(() => {
        if (!appReady || !userToken) return;

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') void refreshAdmin();
        });

        return () => {
            sub.remove();

        };
    }, [appReady, userToken, refreshAdmin]);

    // --- login/logout
    const login = async (token: string) => {
        await SecureStore.setItemAsync(JWT_KEY, token);
        setAuthToken(token);
        setUserToken(token);
        setIsAdmin(null);
        setAdminReady(false);
        await refreshAdmin();
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(JWT_KEY);
        await SecureStore.deleteItemAsync(IS_ADMIN_KEY);
        setAuthToken(null);
        setUserToken(null);
        setIsAdmin(null);
        setAdminReady(true);
    };

    return (
        <AuthContext.Provider
            value={{ userToken, isAdmin, adminReady, appReady, login, logout, refreshAdmin }}
        >
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};




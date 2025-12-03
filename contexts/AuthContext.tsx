import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import { onUnauthorized, setAuthToken, URL } from "../services/api";

type DecodedToken = {
    exp?: number;
    role?: string;
    _id?: string;
    business?: string;
    [k: string]: any;
};

export type AuthUser = {
    _id: string;
    role: "user" | "admin";
    business: string;
    // אפשר להוסיף פה עוד שדות שתחזיר מהשרת
    [k: string]: any;
};

type AuthContextType = {
    userToken: string | null;
    user: AuthUser | null;       // 👈 מידע על המשתמש
    isAdmin: boolean | null;     // null = לא ידוע עדיין
    adminReady: boolean;         // סיים בדיקת שרת
    appReady: boolean;           // סיים Bootstrap מה-SecureStore
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const JWT_KEY = "jwt";
const IS_ADMIN_KEY = "is_admin";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [appReady, setAppReady] = useState(false);
    const [adminReady, setAdminReady] = useState(false);

    // מזהה טיימר ל"בקרה לפני פקיעה"
    const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Bootstrap: טוען טוקן ודגל אדמין מה-SecureStore
    useEffect(() => {
        (async () => {
            const [token, cachedIsAdmin] = await Promise.all([
                SecureStore.getItemAsync(JWT_KEY),
                SecureStore.getItemAsync(IS_ADMIN_KEY),
            ]);

            if (token) {
                setUserToken(token);
                setAuthToken(token); // כל הקריאות דרך services/api יישאו את הטוקן
                console.log("🔐 Stored JWT token:", token);

                // נפענח את ה־JWT כדי לקבל _id/business כבר בשלב הזה
                try {
                    const dec = jwtDecode<DecodedToken>(token);
                    if (dec?._id && dec.business) {
                        setUser({
                            _id: dec._id,
                            role: (dec.role as "user" | "admin") || "user",
                            business: dec.business,
                        });
                    }
                } catch {
                    // אם הפענוח נכשל – נחכה ל־refreshAdmin
                }
            }

            if (cachedIsAdmin === "true") setIsAdmin(true);
            else if (cachedIsAdmin === "false") setIsAdmin(false);
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
            setUser(null);
            return;
        }

        try {
            const res = await fetch(`${URL}/users/checkToken`, {
                method: "GET",
                headers: { "x-api-key": userToken },
            });

            if (res.status === 401) {
                await logout(); // טוקן פג/לא תקין
                return;
            }

            // אם תבחר להחזיר 403 ל"לא אדמין" בצד שרת:
            if (res.status === 403) {
                setIsAdmin(false);
                await SecureStore.setItemAsync(IS_ADMIN_KEY, "false");
                setAdminReady(true);
                // עדיין יכולים לקבל מהשרת _id/business ולהכניס ל-user אם מחזיר
                try {
                    const data = await res.json();
                    if (data?._id) {
                        setUser((prev) => ({
                            ...(prev || {}),
                            _id: data._id,
                            role: data.role ?? (prev?.role ?? "user"),
                            business: data.business ?? prev?.business,
                        }));
                    }
                } catch { }
                return;
            }

            if (!res.ok) {
                setAdminReady(true); // שגיאת שרת/רשת — לא מפילים UX
                return;
            }

            const data = await res.json(); // מצופה { _id, role, business, ... }
            const admin = data?.role === "admin";
            setIsAdmin(admin);
            await SecureStore.setItemAsync(IS_ADMIN_KEY, admin ? "true" : "false");
            if (data?._id && data.business) {
                setUser({
                    _id: data._id,
                    role: admin ? "admin" : "user",
                    business: data.business,
                    ...data,
                });
            }
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

    // --- נרענן כש-appReady מוכן או כש-userToken משתנה
    useEffect(() => {
        if (!appReady) return;
        setAdminReady(false);
        void refreshAdmin();
    }, [appReady, userToken, refreshAdmin]);

    // --- Revalidate כשחוזרים ל-foreground
    useEffect(() => {
        if (!appReady || !userToken) return;

        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") void refreshAdmin();
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

        // נפענח מיד את הטוקן כדי לדעת מי המשתמש
        try {
            const dec = jwtDecode<DecodedToken>(token);
            if (dec?._id && dec.business) {
                setUser({
                    _id: dec._id,
                    role: (dec.role as "user" | "admin") || "user",
                    business: dec.business,
                });
            }
        } catch { }

        await refreshAdmin();
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(JWT_KEY);
        await SecureStore.deleteItemAsync(IS_ADMIN_KEY);
        setAuthToken(null);
        setUserToken(null);
        setIsAdmin(null);
        setUser(null);
        setAdminReady(true);
    };

    return (
        <AuthContext.Provider
            value={{
                userToken,
                user,
                isAdmin,
                adminReady,
                appReady,
                login,
                logout,
                refreshAdmin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
};

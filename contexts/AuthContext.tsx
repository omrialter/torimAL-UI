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
    user: AuthUser | null; // 👈 מידע על המשתמש
    isAdmin: boolean | null; // null = לא ידוע עדיין
    adminReady: boolean; // סיים בדיקת שרת
    appReady: boolean; // סיים Bootstrap מה-SecureStore
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

    // עוזר קטן: בונה AuthUser מתוך JWT מינימלי
    const buildUserFromToken = (token: string | null): AuthUser | null => {
        if (!token) return null;
        try {
            const dec = jwtDecode<DecodedToken>(token);
            if (!dec?._id || !dec.business) return null;

            return {
                _id: dec._id,
                role: (dec.role as "user" | "admin") || "user",
                business: dec.business,
            };
        } catch {
            return null;
        }
    };

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

                // ננסה כבר עכשיו לבנות user מינימלי מה־JWT
                const u = buildUserFromToken(token);
                if (u) {
                    setUser(u);
                }
            } else {
                setUser(null);
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
                // טוקן לא תקין/פג
                await logout();
                return;
            }

            let data: any = null;
            try {
                data = await res.json();
            } catch {
                // ייתכן ואין גוף תשובה – נתעלם
            }

            if (res.status === 403) {
                // משתמש מחובר אבל לא אדמין
                setIsAdmin(false);
                await SecureStore.setItemAsync(IS_ADMIN_KEY, "false");

                // אם קיבלנו פרטי משתמש – נעדכן user
                if (data?._id) {
                    setUser((prev) => ({
                        ...(prev || {}),
                        _id: data._id,
                        role: (data.role as "user" | "admin") || "user",
                        business: data.business ?? prev?.business,
                        ...data,
                    }));
                } else if (!user) {
                    // fallback: לבנות מה-token אם עדיין אין user
                    const fromToken = buildUserFromToken(userToken);
                    if (fromToken) setUser(fromToken);
                }

                setAdminReady(true);
                return;
            }

            if (!res.ok) {
                // שגיאה אחרת – לא מפילים את המשתמש, רק מסמנים שסיימנו
                setAdminReady(true);
                return;
            }

            // 200 OK – השרת מחזיר לנו את פרטי המשתמש
            const admin = data?.role === "admin";
            setIsAdmin(admin);
            await SecureStore.setItemAsync(IS_ADMIN_KEY, admin ? "true" : "false");

            if (data?._id && data.business) {
                setUser((prev) => ({
                    _id: data._id,
                    role: (data.role as "user" | "admin") || "user",
                    business: data.business,
                    ...prev,
                    ...data,
                }));
            } else {
                // אם השרת לא החזיר כלום, לפחות נשאר עם ה־user מה־JWT
                if (!user) {
                    const fromToken = buildUserFromToken(userToken);
                    if (fromToken) setUser(fromToken);
                }
            }

            setAdminReady(true);
        } catch (e) {
            console.log("❌ refreshAdmin error:", e);
            setAdminReady(true); // שגיאת fetch — מתייחסים בעדינות
        }
    }, [userToken, user]);

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
        // שומרים טוקן
        await SecureStore.setItemAsync(JWT_KEY, token);
        setAuthToken(token);
        setUserToken(token);
        setIsAdmin(null);
        setAdminReady(false);

        // בונים מיד user מינימלי מה־JWT כדי שהמסכים יקבלו clientId
        const u = buildUserFromToken(token);
        if (u) {
            setUser(u);
        } else {
            setUser(null);
        }

        // לא קוראים כאן ל-refreshAdmin עם הטוקן הישן;
        // ה-useEffect של userToken ידאג לקרוא לו עם הטוקן החדש.
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

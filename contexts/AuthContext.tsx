// context/AuthContext.tsx
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
import { apiGet, onUnauthorized, setAuthToken } from "../services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

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
    [k: string]: any;
};

type AuthContextType = {
    userToken: string | null;
    user: AuthUser | null;
    isAdmin: boolean | null; // null = טרם נקבע
    adminReady: boolean;     // האם הסתיימה בדיקת הטוקן מול השרת
    appReady: boolean;       // האם הסתיימה הטעינה הראשונית מהמכשיר
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshAdmin: () => Promise<void>;
};

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const JWT_KEY = "jwt";
const IS_ADMIN_KEY = "is_admin";

// ----------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------

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

    /**
     * מחלץ מידע בסיסי מתוך הטוקן (לשימוש מיידי לפני קריאת שרת)
     */
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

    /**
     * Bootstrap: טעינת נתונים ראשונית מה-SecureStore
     */
    useEffect(() => {
        (async () => {
            try {
                const [token, cachedIsAdmin] = await Promise.all([
                    SecureStore.getItemAsync(JWT_KEY),
                    SecureStore.getItemAsync(IS_ADMIN_KEY),
                ]);

                if (token) {
                    setUserToken(token);
                    setAuthToken(token); // עדכון ה-Service כדי שכל קריאה תצא עם טוקן

                    // נסיון לבנות אובייקט משתמש ראשוני מהטוקן השמור
                    const u = buildUserFromToken(token);
                    if (u) setUser(u);
                } else {
                    setUser(null);
                }

                // שחזור סטטוס אדמין מה-Cache
                if (cachedIsAdmin === "true") setIsAdmin(true);
                else if (cachedIsAdmin === "false") setIsAdmin(false);
                else setIsAdmin(null);

            } catch (e) {
                // התעלמות משגיאות קריאה מה-Storage
            } finally {
                setAppReady(true);
            }
        })();
    }, []);

    /**
     * מאזין לאירוע 401 מה-API Service (גלובלי)
     */
    useEffect(() => {
        const removeListener = onUnauthorized(async () => {
            await logout();
        });
        return removeListener;
    }, []);

    /**
     * פונקציית הליבה: אימות טוקן מול השרת וקבלת נתוני משתמש עדכניים
     */
    const refreshAdmin = useCallback(async () => {
        if (!userToken) {
            setIsAdmin(null);
            setAdminReady(true);
            setUser(null);
            return;
        }

        try {
            // שימוש ב-apiGet החדש במקום fetch ידני
            // ה-Service כבר דואג ל-Headers ולטיפול בשגיאות רשת
            const userData = await apiGet<AuthUser>("/users/checkToken");

            // אם הגענו לפה, הסטטוס הוא 200 OK
            if (userData) {
                const admin = userData.role === "admin";
                setIsAdmin(admin);
                await SecureStore.setItemAsync(IS_ADMIN_KEY, admin ? "true" : "false");

                // מיזוג המידע החדש עם הקיים
                setUser((prev) => ({
                    ...(prev || {}),
                    ...userData,
                }));
            }
        } catch (error: any) {
            // טיפול ספציפי בשגיאות לוגיות
            if (error.status === 403) {
                // המשתמש מחובר תקין, אך אינו אדמין
                setIsAdmin(false);
                await SecureStore.setItemAsync(IS_ADMIN_KEY, "false");

                // אם השרת החזיר פרטי משתמש בתוך השגיאה (payload)
                const payloadData = error.payload;
                if (payloadData?._id) {
                    setUser((prev) => ({
                        ...(prev || {}),
                        ...payloadData
                    }));
                }
            }
            // שגיאת 401 מטופלת אוטומטית ע"י ה-onUnauthorized ב-useEffect למעלה

        } finally {
            // בכל מקרה סיימנו את הבדיקה
            setAdminReady(true);
        }
    }, [userToken]);

    /**
     * טיימר לרענון לפני פקיעת הטוקן
     */
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
                // רענון דקה לפני הפקיעה
                const wait = Math.max(msToExp - 60_000, 0);

                expiryTimerRef.current = setTimeout(() => {
                    // מנסים לרענן. אם הפג, השרת יחזיר 401 ויתבצע logout
                    void refreshAdmin();
                }, wait);
            }
        } catch { }

        return () => {
            if (expiryTimerRef.current) {
                clearTimeout(expiryTimerRef.current);
            }
        };
    }, [userToken, refreshAdmin]);

    /**
     * טריגרים לרענון הנתונים
     */
    useEffect(() => {
        if (!appReady) return;
        setAdminReady(false);
        void refreshAdmin();
    }, [appReady, userToken, refreshAdmin]);

    // רענון בחזרה ל-Foreground
    useEffect(() => {
        if (!appReady || !userToken) return;

        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") void refreshAdmin();
        });

        return () => {
            sub.remove();
        };
    }, [appReady, userToken, refreshAdmin]);

    /**
     * פעולות משתמש
     */
    const login = async (token: string) => {
        await SecureStore.setItemAsync(JWT_KEY, token);
        setAuthToken(token);
        setUserToken(token);

        // איפוס זמני עד לבדיקת שרת
        setIsAdmin(null);
        setAdminReady(false);

        // עדכון אופטימי מיידי לממשק
        const u = buildUserFromToken(token);
        setUser(u || null);

        // ה-useEffect של userToken כבר יקרא ל-refreshAdmin
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync(JWT_KEY);
            await SecureStore.deleteItemAsync(IS_ADMIN_KEY);
        } catch (e) {
            // מתעלמים משגיאות מחיקה
        }

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
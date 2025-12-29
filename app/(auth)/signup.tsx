// app/(auth)/signup.tsx
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import Constants from "expo-constants";
import { Link, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Button,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { apiPost } from "@/services/api";
import { useAuth } from "../../contexts/AuthContext";

// ----------------------------------------------------------------------
// Configuration & Types
// ----------------------------------------------------------------------

const BUSINESS_ID = Constants.expoConfig?.extra?.BUSINESS_ID as string;

interface AuthResponse {
    token: string;
    user: {
        _id: string;
        phone: string;
        role: string;
    };
}

// נרמול מספר טלפון לפורמט בינלאומי (+972)
const normalizePhone = (phone: string) => {
    const p = (phone || "").replace(/[^\d+]/g, ""); // ניקוי תווים לא רצויים

    if (p.startsWith("+972")) return p;
    if (p.startsWith("0")) return "+972" + p.slice(1);
    if (p.startsWith("5")) return "+972" + p;

    return p;
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function SignUpScreen() {
    const { login } = useAuth();
    const router = useRouter();

    // State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");

    const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const businessId = useMemo(() => String(BUSINESS_ID || "").trim(), []);

    /**
     * שלב 1: אימות טלפון מול Firebase ושליחת SMS
     */
    const sendOTP = async () => {
        setError(null);

        if (!businessId) {
            setError("שגיאת מערכת: חסר מזהה עסק.");
            return;
        }

        if (!name.trim()) {
            setError("נא להזין שם מלא");
            return;
        }

        const normalized = normalizePhone(phone);
        if (!normalized || normalized.length < 12) {
            setError("נא להזין מספר טלפון תקין");
            return;
        }

        setLoading(true);

        try {
            // הערה: כאן אפשר להוסיף קריאה לשרת לבדוק אם המשתמש כבר קיים
            // כדי לחסוך שליחת SMS, אבל השרת יחזיר שגיאה בהרשמה בכל מקרה.

            // שליחת SMS
            const conf = await auth().signInWithPhoneNumber(normalized);
            setConfirmation(conf);

        } catch (err: any) {
            console.log("OTP Error:", err);
            const msg = err.message || "שגיאה בשליחת הודעת אימות";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    /**
     * שלב 2: אימות קוד, יצירת משתמש בשרת והתחברות
     */
    const verifyAndSignup = async () => {
        if (!confirmation) return;

        setError(null);
        setLoading(true);

        try {
            // 1. אימות מול Firebase
            const credential = await confirmation.confirm(code);

            if (!credential?.user) {
                throw new Error("אימות נכשל מול שירות ההודעות.");
            }

            // 2. קבלת טוקן זיהוי
            const idToken = await credential.user.getIdToken();

            // 3. שליחת בקשת הרשמה לשרת שלנו
            // ה-Service שלנו (apiPost) דואג לכתובת השרת ולטיפול בשגיאות
            const res = await apiPost<AuthResponse>("/users/signup", {
                idToken,
                name,
                businessId,
            });

            // 4. התחברות אוטומטית למערכת
            // הפונקציה login ב-AuthContext כבר שומרת את הטוקן ומעדכנת את ה-State
            await login(res.token);

        } catch (err: any) {
            // חילוץ הודעת שגיאה מהשרת (למשל: "User already exists")
            const serverMsg =
                err?.payload?.error ||
                err?.message ||
                "ההרשמה נכשלה. אנא נסה שנית.";

            setError(String(serverMsg));
        } finally {
            setLoading(false);
        }
    };

    const handleChangeNumber = () => {
        setConfirmation(null);
        setCode("");
        setError(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.content}>
                <Text style={styles.title}>הרשמה ללקוח חדש</Text>

                {!confirmation ? (
                    /* --- שלב 1: פרטים ושליחת קוד --- */
                    <>
                        <Text style={styles.label}>שם מלא</Text>
                        <TextInput
                            placeholder="ישראל ישראלי"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            textAlign="right"
                        />

                        <Text style={styles.label}>מספר טלפון</Text>
                        <TextInput
                            placeholder="050-0000000"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            style={styles.input}
                            textAlign="right"
                        />

                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 10 }} size="large" color="#000" />
                        ) : (
                            <Button title="שלח קוד אימות" onPress={sendOTP} />
                        )}
                    </>
                ) : (
                    /* --- שלב 2: אימות קוד --- */
                    <>
                        <Text style={styles.label}>קוד אימות (נשלח ב-SMS)</Text>
                        <TextInput
                            placeholder="123456"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            style={[styles.input, { letterSpacing: 5, fontSize: 20, textAlign: 'center' }]}
                            maxLength={6}
                        />

                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 10 }} size="large" color="#000" />
                        ) : (
                            <View style={{ gap: 10 }}>
                                <Button title="אמת והירשם" onPress={verifyAndSignup} />

                                <TouchableOpacity onPress={handleChangeNumber} style={styles.changeNumberBtn}>
                                    <Text style={styles.changeNumberText}>תיקון מספר טלפון</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.loginSection}>
                    <Text style={styles.loginText}>כבר יש לך חשבון?</Text>
                    <Link href="/login" style={styles.loginLink}>
                        התחבר כאן
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        marginBottom: 40,
        fontWeight: "bold",
        textAlign: "center",
        color: "#333",
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: "#666",
        textAlign: "right",
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        marginBottom: 24,
        paddingVertical: 12,
        paddingHorizontal: 4,
        fontSize: 18,
        backgroundColor: "#f9f9f9",
    },
    error: {
        color: "red",
        marginTop: 20,
        textAlign: "center",
        fontSize: 14,
    },
    loginSection: {
        marginTop: 40,
        alignItems: "center",
    },
    loginText: {
        color: "#888",
        marginBottom: 4,
    },
    loginLink: {
        color: "#007AFF",
        fontWeight: "600",
        fontSize: 16,
    },
    changeNumberBtn: {
        padding: 10,
        alignItems: "center",
    },
    changeNumberText: {
        color: "#007AFF",
    },
});
// app/(auth)/login.tsx
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import Constants from "expo-constants";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
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

import { apiPost, TOKEN_KEY } from "@/services/api";
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

interface CheckPhoneResponse {
    ok: boolean;
}

// נרמול מספר טלפון לפורמט בינלאומי (+972)
const normalizePhone = (phone: string) => {
    const p = (phone || "").trim();
    if (p.startsWith("0")) {
        return p.replace(/^0/, "+972");
    }
    return p;
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();

    // State
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // מזהה עסק מחושב פעם אחת
    const businessId = useMemo(() => String(BUSINESS_ID || "").trim(), []);

    /**
     * שלב 1: אימות טלפון מול השרת ושליחת SMS
     */
    const sendOTP = async () => {
        setError(null);

        if (!businessId) {
            setError("שגיאת קונפיגורציה: חסר מזהה עסק (BUSINESS_ID).");
            return;
        }

        const normalized = normalizePhone(phone);
        if (!normalized || normalized.length < 12) { // +9725XXXXXXXX (12 chars min)
            setError("נא להזין מספר טלפון תקין");
            return;
        }

        setLoading(true);

        try {
            // 1. בדיקה מול השרת שלנו שהמשתמש קיים בעסק הזה
            await apiPost<CheckPhoneResponse>("/users/check-phone", {
                phone: normalized,
                businessId,
            });

            // 2. שליחת SMS דרך Firebase
            const conf = await auth().signInWithPhoneNumber(normalized);
            setConfirmation(conf);

        } catch (err: any) {
            // חילוץ הודעת שגיאה מסודרת מה-Payload או מה-Error
            const serverMsg =
                err?.payload?.message ||
                err?.payload?.error ||
                err?.message ||
                "שגיאה בשליחת קוד אימות. נא לבדוק את המספר.";

            setError(String(serverMsg));
        } finally {
            setLoading(false);
        }
    };

    /**
     * שלב 2: אימות קוד ה-SMS, קבלת טוקן והתחברות
     */
    const verifyOTP = async () => {
        if (!confirmation) return;
        if (code.length < 6) {
            setError("קוד האימות חייב להכיל 6 ספרות");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            // 1. אימות הקוד מול Firebase
            const credential = await confirmation.confirm(code);

            if (!credential?.user) {
                throw new Error("אימות נכשל מול שירותי ההודעות.");
            }

            // 2. הפקת טוקן זיהוי (ID Token) מ-Firebase
            const idToken = await credential.user.getIdToken(true);

            if (!idToken) {
                throw new Error("לא התקבל טוקן זיהוי.");
            }

            // 3. שליחת הטוקן לשרת שלנו לאימות סופי וקבלת JWT של המערכת
            const res = await apiPost<AuthResponse>("/users/verify", {
                idToken,
                businessId,
            });

            // 4. שמירת JWT והתחברות
            await SecureStore.setItemAsync(TOKEN_KEY, res.token);

            // עדכון ה-Context (זה יגרום ל-auth/_layout להעביר אותנו אוטומטית)
            await login(res.token);

        } catch (err: any) {
            const serverMsg =
                err?.payload?.details ||
                err?.payload?.message ||
                err?.payload?.error ||
                "קוד שגוי או פג תוקף, אנא נסה שנית.";

            setError(String(serverMsg));
        } finally {
            setLoading(false);
        }
    };

    /**
     * אפשרות לשינוי מספר הטלפון (חזרה אחורה)
     */
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
                <Text style={styles.title}>התחברות</Text>

                {!confirmation ? (
                    /* --- שלב 1: הזנת טלפון --- */
                    <>
                        <Text style={styles.label}>מספר טלפון</Text>
                        <TextInput
                            placeholder="050-0000000"
                            onChangeText={setPhone}
                            value={phone}
                            keyboardType="phone-pad"
                            style={styles.input}
                            textAlign="right"
                            editable={!loading}
                        />

                        {loading ? (
                            <ActivityIndicator size="large" color="#000" style={{ marginTop: 10 }} />
                        ) : (
                            <Button title="שלח קוד אימות" onPress={sendOTP} />
                        )}
                    </>
                ) : (
                    /* --- שלב 2: הזנת קוד --- */
                    <>
                        <Text style={styles.label}>קוד אימות שנשלח ב-SMS</Text>
                        <TextInput
                            placeholder="123456"
                            onChangeText={setCode}
                            value={code}
                            keyboardType="number-pad"
                            style={[styles.input, { letterSpacing: 5, fontSize: 20, textAlign: 'center' }]}
                            maxLength={6}
                            editable={!loading}
                        />

                        {loading ? (
                            <ActivityIndicator size="large" color="#000" style={{ marginTop: 10 }} />
                        ) : (
                            <View style={{ gap: 10 }}>
                                <Button title="אמת והתחבר" onPress={verifyOTP} />
                                <TouchableOpacity onPress={handleChangeNumber} style={styles.changeNumberBtn}>
                                    <Text style={styles.changeNumberText}>שינוי מספר טלפון</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {/* --- הודעות שגיאה --- */}
                {error && <Text style={styles.error}>{error}</Text>}

                {/* --- לינק להרשמה --- */}
                <View style={styles.signupSection}>
                    <Text style={styles.signupText}>עדיין אין לך חשבון?</Text>
                    <Link href="/signup" style={styles.signupLink}>
                        הרשמה ללקוח חדש
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
        textAlign: "right", // עברית
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        marginBottom: 24,
        paddingVertical: 12,
        paddingHorizontal: 4,
        fontSize: 18,
        backgroundColor: "#f9f9f9", // רקע עדין לשדה
    },
    error: {
        marginTop: 20,
        color: "red",
        textAlign: "center",
        fontSize: 14,
    },
    signupSection: {
        marginTop: 40,
        alignItems: "center",
    },
    signupText: {
        color: "#888",
        marginBottom: 4,
    },
    signupLink: {
        color: "#007AFF", // צבע כחול סטנדרטי ללינקים
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
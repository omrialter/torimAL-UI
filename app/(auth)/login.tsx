// app/(auth)/OTPLogin.tsx
import { apiPost, TOKEN_KEY, URL } from "@/services/api";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import Constants from "expo-constants";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

// קונפיג מה־app.config.js (רק BUSINESS_ID – את ה-API_URL כבר יש לנו ב-api.ts)
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

// נרמול טלפון
const normalizePhone = (phone: string) => {
    const p = (phone || "").trim();
    return p.startsWith("0") ? p.replace(/^0/, "+972") : p;
};

export default function OTPLogin() {
    const { login } = useAuth();
    const router = useRouter();

    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [confirmation, setConfirmation] =
        useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const businessId = useMemo(() => String(BUSINESS_ID || "").trim(), []);

    const sendOTP = async () => {
        try {
            setError(null);
            setLoading(true);

            if (!businessId) {
                setError("חסר BUSINESS_ID בקונפיג");
                return;
            }

            const normalized = normalizePhone(phone);

            if (!normalized || normalized.length < 8) {
                setError("מספר טלפון לא תקין");
                return;
            }

            // 1) בדיקה בשרת שהמספר שייך לעסק
            await apiPost<CheckPhoneResponse>("/users/check-phone", {
                phone: normalized,
                businessId,
            });

            // 2) שליחת SMS דרך Firebase native
            const conf = await auth().signInWithPhoneNumber(normalized);
            setConfirmation(conf);
        } catch (err: any) {
            console.error("sendOTP error:", err);

            // api.ts זורק Error עם message + payload אם קיים
            const serverMsg =
                err?.payload?.message ||
                err?.payload?.error ||
                err?.message ||
                "Failed to send OTP. Please check the phone number.";

            setError(String(serverMsg));
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        if (!confirmation) return;

        try {
            setError(null);
            setLoading(true);

            if (!businessId) {
                setError("חסר BUSINESS_ID בקונפיג");
                return;
            }

            // 1) אימות קוד ב-Firebase
            const credential = await confirmation.confirm(code);

            if (!credential?.user) {
                setError("אימות נכשל. נסה שוב.");
                return;
            }

            // 2) תמיד להוציא token טרי
            const idToken = await credential.user.getIdToken(true);

            console.log("🔐 verifyOTP debug:", {
                apiUrl: URL,
                businessId,
                idTokenLen: idToken?.length,
            });

            if (!idToken || idToken.length < 50) {
                setError("idToken לא תקין (ריק/קצר מדי)");
                return;
            }

            // 3) שליחת ה-idToken לשרת
            const res = await apiPost<AuthResponse>("/users/verify", {
                idToken,
                businessId,
            });

            // 4) שמירת JWT מהשרת
            await SecureStore.setItemAsync(TOKEN_KEY, res.token);
            login(res.token);

            console.log("✅ JWT token from server:", res.token);

            // אופציונלי:
            // router.replace("/(user)");
        } catch (err: any) {
            console.error("verifyOTP error:", err);

            const serverMsg =
                err?.payload?.details ||
                err?.payload?.message ||
                err?.payload?.error ||
                err?.message ||
                "שגיאה בהתחברות";

            // זה כבר לא “Invalid OTP code” לכל דבר.
            setError(String(serverMsg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            {!confirmation ? (
                <>
                    <TextInput
                        placeholder="Enter phone number (05...)"
                        onChangeText={setPhone}
                        value={phone}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 6 }} />
                    ) : (
                        <Button title="Send OTP" onPress={sendOTP} disabled={loading} />
                    )}
                </>
            ) : (
                <>
                    <TextInput
                        placeholder="Enter OTP"
                        onChangeText={setCode}
                        value={code}
                        keyboardType="number-pad"
                        style={styles.input}
                    />
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 6 }} />
                    ) : (
                        <Button title="Verify Code" onPress={verifyOTP} disabled={loading} />
                    )}
                </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.signupSection}>
                <Text>dont have an account yet?</Text>
                <Link href="/signup" style={styles.signupBtn}>
                    Signup page
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 30,
        marginBottom: 30,
        fontWeight: "700",
    },
    input: {
        borderBottomWidth: 1,
        marginBottom: 16,
        padding: 10,
        minWidth: 260,
    },
    error: {
        marginTop: 10,
        color: "red",
        textAlign: "center",
    },
    signupSection: {
        paddingTop: 20,
        alignItems: "center",
    },
    signupBtn: {
        color: "blue",
        marginTop: 6,
    },
});

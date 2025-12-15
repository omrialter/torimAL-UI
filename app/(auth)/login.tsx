// app/(auth)/OTPLogin.tsx
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import axios from "axios";
import Constants from "expo-constants";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

// ✅ קונפיג מה־app.config.js
const API_URL = Constants.expoConfig?.extra?.API_URL as string;
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

// נרמול טלפון כמו קודם
const normalizePhone = (phone: string) => {
    return phone.startsWith("0") ? phone.replace(/^0/, "+972") : phone;
};

export default function OTPLogin() {
    const { login } = useAuth();
    const router = useRouter();

    const [phone, setPhone] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [confirmation, setConfirmation] =
        useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const sendOTP = async () => {
        try {
            setError(null);
            setLoading(true);

            const normalized = normalizePhone(phone);

            // 1) קודם בדיקה בשרת שהמספר שייך לעסק
            await axios.post<CheckPhoneResponse>(`${API_URL}/users/check-phone`, {
                phone: normalized,
                businessId: BUSINESS_ID,
            });

            // 2) אם הכל טוב – שולחים SMS דרך React Native Firebase
            const conf = await auth().signInWithPhoneNumber(normalized);
            setConfirmation(conf);
        } catch (err: any) {
            console.error("Validation or OTP send failed:", err);
            setError(
                err?.response?.data?.error ||
                "Failed to send OTP. Please check the phone number."
            );
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        if (!confirmation) return;

        try {
            setError(null);
            setLoading(true);

            // 1) אימות קוד ב-Firebase (native)
            const credential = await confirmation.confirm(code);

            if (!credential || !credential.user) {
                setError("אימות נכשל. נסה שוב.");
                return;
            }

            const idToken = await credential.user.getIdToken();

            // 2) שליחת ה-idToken + businessId לשרת שלך
            const res = await axios.post<AuthResponse>(`${API_URL}/users/verify`, {
                idToken,
                businessId: BUSINESS_ID,
            });

            await SecureStore.setItemAsync("jwt", res.data.token);
            login(res.data.token);

            console.log("JWT token from server:", res.data.token);
            // אפשר אח"כ לכוון ל־stack של המשתמש:
            // router.replace("/(user)");
        } catch (err) {
            console.error("OTP verification failed:", err);
            setError("Invalid OTP code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login page</Text>

            {!confirmation ? (
                <>
                    <TextInput
                        placeholder="Enter phone number (05...)"
                        onChangeText={setPhone}
                        value={phone}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                    <Button
                        title={loading ? "Sending..." : "Send OTP"}
                        onPress={sendOTP}
                        disabled={loading}
                    />
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
                    <Button
                        title={loading ? "Verifying..." : "Verify Code"}
                        onPress={verifyOTP}
                        disabled={loading}
                    />
                </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.signupSection}>
                <Text>dont have an account yet? </Text>
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
    },
    title: {
        fontSize: 30,
        marginBottom: 50,
    },
    input: {
        borderBottomWidth: 1,
        marginBottom: 20,
        padding: 10,
        minWidth: 220,
    },
    error: {
        marginTop: 10,
        color: "red",
    },
    signupSection: {
        paddingTop: 20,
        alignItems: "center",
    },
    signupBtn: {
        color: "blue",
    },
});

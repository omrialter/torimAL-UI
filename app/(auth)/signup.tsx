// app/(auth)/signup.tsx
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import axios from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

// קונפיג מה־app.config.js
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

export default function SignUpScreen() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [confirmation, setConfirmation] =
        useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const normalizePhone = (raw: string) => {
        if (!raw) return raw;
        return raw.startsWith("0") ? raw.replace(/^0/, "+972") : raw;
    };

    const sendOTP = async () => {
        try {
            setError(null);
            setLoading(true);

            if (!BUSINESS_ID) {
                setError("Missing BUSINESS_ID in app config");
                return;
            }

            const normalized = normalizePhone(phone);

            const conf = await auth().signInWithPhoneNumber(normalized);
            setConfirmation(conf);
        } catch (err) {
            console.error("OTP send failed:", err);
            setError("Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyAndSignup = async () => {
        if (!confirmation) return;

        try {
            setError(null);
            setLoading(true);

            const credential = await confirmation.confirm(code);

            if (!credential || !credential.user) {
                setError("אימות נכשל. נסה שוב.");
                return;
            }

            const idToken = await credential.user.getIdToken();

            const res = await axios.post<AuthResponse>(`${API_URL}/users/signup`, {
                idToken,
                name,
                businessId: BUSINESS_ID,
            });

            await SecureStore.setItemAsync("jwt", res.data.token);

            // כרגע אחרי הרשמה מחזירים למסך התחברות (כמו שהיה)
            router.replace("/login");
        } catch (err: any) {
            console.error("Signup failed:", err);
            setError(err.response?.data?.error || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign up page</Text>

            {!confirmation ? (
                <>
                    <TextInput
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Phone (05...)"
                        value={phone}
                        onChangeText={setPhone}
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
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        style={styles.input}
                    />
                    <Button
                        title={loading ? "Verifying..." : "Verify and Sign Up"}
                        onPress={verifyAndSignup}
                        disabled={loading}
                    />
                </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
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
        color: "red",
        marginTop: 10,
    },
});

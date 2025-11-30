// OTPLogin.tsx
import axios from 'axios';
import Constants from 'expo-constants';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ConfirmationResult, signInWithPhoneNumber } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase-config';
// ❌ no more import { URL } from '../../services/api';

// ✅ read from app.config.js → extra
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

export default function OTPLogin() {
    const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
    const { login } = useAuth();
    const router = useRouter();

    const [phone, setPhone] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // אפשר להשאיר את הנרמול גם בצד לקוח – אין בעיה
    const normalizePhone = (phone: string) => {
        return phone.startsWith('0') ? phone.replace('0', '+972') : phone;
    };

    const sendOTP = async () => {
        try {
            const normalized = normalizePhone(phone);

            // 1) בדיקה בצד שרת אם המספר קיים בעסק הזה
            const res = await axios.post<CheckPhoneResponse>(`${API_URL}/users/check-phone`, {
                phone: normalized,
                businessId: BUSINESS_ID,
            });

            if (res.data.ok) {
                console.log('res.data is ok');
                // 2) אם קיים – שולחים OTP דרך Firebase
                const confirmationResult = await signInWithPhoneNumber(
                    auth,
                    normalized,
                    recaptchaVerifier.current!
                );
                setConfirmation(confirmationResult);
                setError(null);
            }
        } catch (err: any) {
            console.error('Validation or OTP send failed:', err);
            setError(err?.response?.data?.error || 'Failed to send OTP');
        }
    };

    const verifyOTP = async () => {
        if (!confirmation) return;

        try {
            // 1) אימות הקוד מול Firebase
            const result = await confirmation.confirm(code);
            const idToken = await result.user.getIdToken();

            // 2) שליחת ה-idToken + businessId לשרת שלך
            const res = await axios.post<AuthResponse>(`${API_URL}/users/verify`, {
                idToken,
                businessId: Constants.expoConfig?.extra?.BUSINESS_ID,
            });

            await SecureStore.setItemAsync('jwt', res.data.token);
            login(res.data.token);

            console.log('JWT token from server:', res.data.token);
            // router.replace('/(user)'); // כשתרצה

            setError(null);
        } catch (err) {
            console.error('OTP verification failed:', err);
            setError('Invalid OTP code');
        }
    };

    return (
        <>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={auth.app.options}
            />
            <View style={styles.container}>
                <Text style={styles.title}>Login page</Text>
                {!confirmation ? (
                    <>
                        <TextInput
                            placeholder="Enter phone number (only digits) (05...)"
                            onChangeText={setPhone}
                            value={phone}
                            keyboardType="phone-pad"
                            style={styles.input}
                        />
                        <Button title="Send OTP" onPress={sendOTP} />
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
                        <Button title="Verify Code" onPress={verifyOTP} />
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
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 30,
        marginBottom: 50,
    },
    input: {
        borderBottomWidth: 1,
        marginBottom: 20,
        padding: 10,
    },
    error: {
        marginTop: 10,
        color: 'red',
    },
    signupSection: {
        paddingTop: 20,
        alignItems: 'center',
    },
    signupBtn: {
        color: 'blue',
    },
});

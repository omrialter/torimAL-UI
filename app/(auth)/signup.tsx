// app/(auth)/signup.tsx
import axios from 'axios';
import Constants from 'expo-constants';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ConfirmationResult, signInWithPhoneNumber } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../../firebase-config';
import { URL } from '../../services/api';

interface AuthResponse {
    token: string;
    user: {
        _id: string;
        phone: string;
        role: string;
    };
}

export default function SignUpScreen() {
    const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const businessId = Constants.expoConfig?.extra?.BUSINESS_ID;

    // כמו ב־login – רק לצורך שליחת SMS
    const normalizePhone = (raw: string) => {
        if (!raw) return raw;
        return raw.startsWith('0') ? raw.replace(/^0/, '+972') : raw;
    };

    const sendOTP = async () => {
        try {
            if (!businessId) {
                setError('Missing BUSINESS_ID in app config');
                return;
            }

            const normalized = normalizePhone(phone);

            const confirmationResult = await signInWithPhoneNumber(
                auth,
                normalized,
                recaptchaVerifier.current!
            );

            setConfirmation(confirmationResult);
            setError(null);
        } catch (err) {
            console.error('OTP send failed:', err);
            setError('Failed to send OTP');
        }
    };

    const verifyAndSignup = async () => {
        if (!confirmation) return;

        try {
            const result = await confirmation.confirm(code);
            const idToken = await result.user.getIdToken();

            const res = await axios.post<AuthResponse>(`${URL}/users/signup`, {
                idToken,
                name,
                businessId,
            });

            await SecureStore.setItemAsync('jwt', res.data.token);

            // אחרי הרשמה – נחזיר למסך התחברות
            router.replace('/login');
        } catch (err: any) {
            console.error('Signup failed:', err);
            setError(err.response?.data?.error || 'Signup failed');
        }
    };

    return (
        <>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={auth.app.options}
            />

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
                        <Button title="Send OTP" onPress={sendOTP} />
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
                        <Button title="Verify and Sign Up" onPress={verifyAndSignup} />
                    </>
                )}

                {error && <Text style={styles.error}>{error}</Text>}
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
        color: 'red',
        marginTop: 10,
    },
});

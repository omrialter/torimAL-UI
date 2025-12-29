// app/(auth)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
    const { userToken, appReady } = useAuth();

    // שלב 1: המתנה לטעינה ראשונית
    // אנחנו בודקים ב-SecureStore אם יש טוקן שמור לפני שמחליטים איזה מסך להציג
    if (!appReady) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    // שלב 2: אם המשתמש כבר מחובר, נעיף אותו החוצה מתיקיית ה-Auth
    // ונשלח אותו ישירות לאזור המשתמשים (user)
    if (userToken) {
        return <Redirect href="/(user)" />;
    }

    // שלב 3: המשתמש לא מחובר והאפליקציה טענה את הנתונים -> נציג את מסכי ההתחברות/הרשמה
    return <Slot />;
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff', // מומלץ לוודא שזה מתאים לרקע הכללי שלך
    },
});
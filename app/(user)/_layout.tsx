// app/(user)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedLayout() {
    const { userToken, appReady } = useAuth();

    // שלב 1: המתנה לטעינת האפליקציה (בדיקת SecureStore)
    if (!appReady) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    // שלב 2: אם אין טוקן, המשתמש לא מורשה -> העברה למסך התחברות
    if (!userToken) {
        return <Redirect href="/login" />;
    }

    // שלב 3: המשתמש מחובר -> הצגת התוכן הפנימי (index, orderTor וכו')
    return <Slot />;
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff', // מומלץ לוודא צבע רקע תואם לערכת הנושא
    },
});
// app/admin/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { appReady, userToken, adminReady, isAdmin } = useAuth();

  // שלב 1: המתנה לטעינת נתונים קריטיים
  // appReady = טעינת טוקן מהמכשיר
  // adminReady = בדיקת הטוקן מול השרת כדי לוודא הרשאות ניהול
  if (!appReady || !adminReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // שלב 2: אם אין טוקן בכלל -> להעיף למסך התחברות
  if (!userToken) {
    return <Redirect href="/login" />;
  }

  // שלב 3: יש טוקן, אבל המשתמש אינו מנהל -> להעיף למסך הבית של המשתמשים
  if (!isAdmin) {
    return <Redirect href="/" />;
  }

  // שלב 4: הכל תקין, המשתמש הוא מנהל -> הצג את תוכן הניהול
  return <Slot />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
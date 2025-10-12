// app/admin/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';


export default function AdminLayout() {
  const { appReady, userToken, adminReady, isAdmin } = useAuth();

  if (!appReady || !adminReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userToken) return <Redirect href="/login" />;
  if (!isAdmin) return <Redirect href="/" />;

  return <Slot />;
}
// app/(auth)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
    const { userToken, appReady } = useAuth();

    if (!appReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (userToken) {
        return <Redirect href="/(user)" />;
    }

    return <Slot />;
}

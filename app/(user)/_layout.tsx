// app/(user)/_layout.tsx
import { Redirect, Slot, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';



export default function ProtectedLayout() {
    const { userToken, appReady } = useAuth();
    const pathname = usePathname();

    if (!appReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!userToken) {
        return <Redirect href="/login" />;
    }

    return <Slot />;
}

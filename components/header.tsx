// components/header.tsx
import Constants from "expo-constants";
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const appName = Constants.expoConfig?.name;

export default function Header({ onMenuPress }: { onMenuPress: () => void }) {
    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.spacer} />
                <Text numberOfLines={1} style={[styles.title, { textTransform: "capitalize" }]}>
                    {appName}
                </Text>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Open menu"
                    style={styles.menuButton}
                    onPress={onMenuPress}
                >
                    <View style={styles.bar} />
                    <View style={styles.bar} />
                    <View style={styles.bar} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
    safeArea: { backgroundColor: '#000' },
    container: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#000',
    },
    spacer: { width: 32 },
    title: {
        flex: 1,
        textAlign: 'center',
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    menuButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    bar: {
        width: 22,
        height: 2,
        backgroundColor: '#fff',
        marginVertical: 2,
        borderRadius: 1,
    },
});

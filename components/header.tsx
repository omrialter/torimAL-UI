// components/header.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusinessDataContext } from "@/contexts/BusinessDataContext";

// הגדרת טיפוס מינימלי לנתונים שההדר צריך כדי למנוע שגיאות TS
type HeaderBusinessData = {
    name?: string;
    [key: string]: any;
};

// קבוע לגובה ההדר
const HEADER_HEIGHT = 56;

type Props = {
    onMenuPress: () => void;
};

export default function Header({ onMenuPress }: Props) {
    const { businessData } = useBusinessDataContext();

    // המרה לטיפוס המוכר כדי למנוע את השגיאה שראית בצילום המסך
    const data = businessData as HeaderBusinessData | null;
    const businessName = data?.name || '';

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.container}>
                {/* Spacer כדי לאזן את הכותרת למרכז (אותו רוחב כמו כפתור התפריט) */}
                <View style={styles.spacer} />

                <Text style={styles.title} numberOfLines={1}>
                    {businessName}
                </Text>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Open menu"
                    style={styles.menuButton}
                    onPress={onMenuPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    {/* אייקון המבורגר (3 פסים) */}
                    <View style={styles.bar} />
                    <View style={styles.bar} />
                    <View style={styles.bar} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#111'
    },
    container: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#111',
    },
    spacer: {
        width: 32
    },
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
        alignItems: 'flex-end', // מיישר את הפסים לצד ימין (או שמאל תלוי בכיוון, כאן נראה שזה מכוון ליישור ספציפי)
    },
    bar: {
        width: 22,
        height: 2,
        backgroundColor: '#fff',
        marginVertical: 2,
        borderRadius: 1,
    },
});
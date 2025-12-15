// components/FooterSection.tsx
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
    onPressTiktok?: () => void;
    onPressFacebook?: () => void;
    onPressInstagram?: () => void;
    onPressWhatsapp?: () => void;
}

export default function FooterSection({
    onPressTiktok,
    onPressFacebook,
    onPressInstagram,
    onPressWhatsapp,
}: Props) {
    const openTorimAL = () => {
        Linking.openURL("https://torimal.co.il");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>עקבו אחרינו</Text>

            {/* אייקוני רשתות */}
            <View style={styles.iconsRow}>
                <TouchableOpacity onPress={onPressTiktok} hitSlop={12}>
                    <FontAwesome5 name="tiktok" size={24} color="#0f172a" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressFacebook} hitSlop={12}>
                    <FontAwesome name="facebook-official" size={26} color="#1877f2" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressInstagram} hitSlop={12}>
                    <FontAwesome name="instagram" size={26} color="#e11d48" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressWhatsapp} hitSlop={12}>
                    <FontAwesome name="whatsapp" size={26} color="#22c55e" />
                </TouchableOpacity>
            </View>

            {/* קו מפריד דק */}
            <View style={styles.divider} />

            {/* שורת קרדיט + לינק */}
            <View style={styles.creditRow}>
                <TouchableOpacity onPress={openTorimAL}>
                    <Text style={styles.footerLink}>TorimAL</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>מופעל על ידי </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 16,        // מרווח קטן בין סוף האפליקציה ל־footer
        paddingHorizontal: 24,
        paddingVertical: 40,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
        alignItems: "center",
        gap: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6b7280",
        letterSpacing: 0.5,
    },
    iconsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginTop: 4,
        marginBottom: 4,
    },
    divider: {
        height: 1,
        width: "70%",
        backgroundColor: "#e5e7eb",
        marginTop: 4,
        marginBottom: 4,
    },
    creditRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    footerText: {
        fontSize: 12,
        color: "#6b7280",
    },
    footerLink: {
        fontSize: 12,
        color: "#2563eb",
        fontWeight: "600",
        textDecorationLine: "underline",
    },
});

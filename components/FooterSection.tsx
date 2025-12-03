// components/FooterSection.tsx
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    return (
        <View style={styles.container}>
            <Text style={styles.title}>עקבו אחרינו</Text>

            {/* אייקוני רשתות */}
            <View style={styles.iconsRow}>
                <TouchableOpacity onPress={onPressTiktok}>
                    <FontAwesome5 name="tiktok" size={24} color="#111827" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressFacebook}>
                    <FontAwesome name="facebook-official" size={26} color="#1877f2" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressInstagram}>
                    <FontAwesome name="instagram" size={26} color="#e11d48" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressWhatsapp}>
                    <FontAwesome name="whatsapp" size={26} color="#22c55e" />
                </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
                TorimAL | מופעל על ידי
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderColor: "white",
        borderWidth: 2,
        marginTop: 24,
        marginBottom: 32,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 40
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
        color: "#111827",
    },
    iconsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginBottom: 12,
    },
    subText: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 4,
    },
    footerText: {
        fontSize: 12,
        color: "#6b7280",
    },
});

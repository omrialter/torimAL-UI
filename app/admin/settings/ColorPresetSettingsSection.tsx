// app/admin/settings/ColorPresetSettingsSection.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL } from "@/services/api";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// אותם שמות כמו בשרת
const PRESET_OPTIONS = [
    { key: "professional", label: "Professional" },
    { key: "midnight", label: "Midnight" },
    { key: "forest", label: "Forest" },
    { key: "sunset", label: "Sunset" },
    { key: "royal", label: "Royal" },
];

// רק לצורך תצוגה באפליקציה – לא משפיע על השרת
const PRESET_COLORS: Record<
    string,
    { primary: string; secondary: string; third: string }
> = {
    professional: {
        primary: "#1d4ed8",
        secondary: "#f3f4f6",
        third: "#0b1120",
    },
    midnight: {
        primary: "#0f172a",
        secondary: "#020617",
        third: "#38bdf8",
    },
    forest: {
        primary: "#15803d",
        secondary: "#ecfdf3",
        third: "#064e3b",
    },
    sunset: {
        primary: "#ea580c",
        secondary: "#fff7ed",
        third: "#7c2d12",
    },
    royal: {
        primary: "#4c1d95",
        secondary: "#f5f3ff",
        third: "#1e1b4b",
    },
};

export default function ColorPresetSettingsSection() {
    const { colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [updatingPreset, setUpdatingPreset] = useState<string | null>(null);

    const handleChangePreset = async (presetKey: string) => {
        try {
            setUpdatingPreset(presetKey);

            const res = await fetch(`${URL}/businesses/colors`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": userToken || "",
                },
                body: JSON.stringify({ preset: presetKey }),
            });

            const rawText = await res.text();
            console.log(
                "📥 change preset response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("change preset error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לעדכן צבעים כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "צבעי העסק עודכנו.");
        } catch (err) {
            console.log("change preset error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בעדכון הצבעים.");
        } finally {
            setUpdatingPreset(null);
        }
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>צבעי אפליקציה</Text>
            <Text style={styles.cardSubtitle}>
                בחר קומבינציית צבעים למיתוג האפליקציה.
            </Text>

            <View style={styles.presetsRow}>
                {PRESET_OPTIONS.map((p) => {
                    const preview = PRESET_COLORS[p.key];
                    return (
                        <TouchableOpacity
                            key={p.key}
                            style={[
                                styles.presetButton,
                                updatingPreset === p.key && {
                                    borderColor: colorsSafe.primary,
                                },
                            ]}
                            onPress={() => handleChangePreset(p.key)}
                            disabled={!!updatingPreset}
                        >
                            <View style={styles.presetHeader}>
                                <Text style={styles.presetLabel}>
                                    {p.label}
                                </Text>
                                {updatingPreset === p.key && (
                                    <ActivityIndicator size="small" />
                                )}
                            </View>
                            {/* הצגת שלושת הצבעים */}
                            {preview && (
                                <View style={styles.colorRow}>
                                    <View
                                        style={[
                                            styles.colorDot,
                                            { backgroundColor: preview.primary },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.colorDot,
                                            {
                                                backgroundColor:
                                                    preview.secondary,
                                            },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.colorDot,
                                            { backgroundColor: preview.third },
                                        ]}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
    },
    presetsRow: {
        flexDirection: "column",
        gap: 8,
        marginTop: 8,
    },
    presetButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    presetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    presetLabel: {
        fontSize: 13,
        fontWeight: "600",
    },
    colorRow: {
        flexDirection: "row",
        gap: 6,
    },
    colorDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
});

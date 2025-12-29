// app/admin/settings/ColorPresetSettingsSection.tsx
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiPatch } from "@/services/api";

// ----------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------

type ColorPreset = {
    primary: string;
    secondary: string;
    third: string;
};

const PRESET_OPTIONS = [
    { key: "professional", label: "Professional" },
    { key: "midnight", label: "Midnight" },
    { key: "forest", label: "Forest" },
    { key: "sunset", label: "Sunset" },
    { key: "royal", label: "Royal" },
];

const PRESET_COLORS: Record<string, ColorPreset> = {
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

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function ColorPresetSettingsSection() {
    const { colors, refetch } = useBusinessDataContext();
    const currentPrimary = colors?.primary;

    const [updatingPreset, setUpdatingPreset] = useState<string | null>(null);

    const handleChangePreset = async (presetKey: string) => {
        setUpdatingPreset(presetKey);

        try {
            const res = await apiPatch("/businesses/colors", { preset: presetKey });

            if (res) { // apiPatch מחזיר null במקרה של כישלון
                await refetch();
                Alert.alert("הצלחה", "צבעי העסק עודכנו.");
            } else {
                Alert.alert("שגיאה", "לא ניתן לעדכן צבעים כרגע.");
            }
        } catch (err) {
            console.error("Change preset error:", err);
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
                    const isSelected = preview?.primary === currentPrimary; // זיהוי בסיסי לפי צבע ראשי

                    return (
                        <TouchableOpacity
                            key={p.key}
                            style={[
                                styles.presetButton,
                                isSelected && { borderColor: preview.primary, borderWidth: 2 },
                            ]}
                            onPress={() => handleChangePreset(p.key)}
                            disabled={!!updatingPreset}
                        >
                            <View style={styles.presetHeader}>
                                <Text style={[styles.presetLabel, isSelected && { color: preview.primary }]}>
                                    {p.label}
                                </Text>
                                {updatingPreset === p.key && <ActivityIndicator size="small" />}
                            </View>

                            {preview && (
                                <View style={styles.colorRow}>
                                    <View style={[styles.colorDot, { backgroundColor: preview.primary }]} />
                                    <View style={[styles.colorDot, { backgroundColor: preview.secondary }]} />
                                    <View style={[styles.colorDot, { backgroundColor: preview.third }]} />
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
        textAlign: "right", // עברית
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "right", // עברית
        marginBottom: 8,
    },
    presetsRow: {
        flexDirection: "column",
        gap: 12,
    },
    presetButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    presetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    presetLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    colorRow: {
        flexDirection: "row",
        gap: 8,
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
});
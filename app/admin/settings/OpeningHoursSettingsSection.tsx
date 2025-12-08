// app/admin/settings/OpeningHoursSettingsSection.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL } from "@/services/api";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const DAY_LABELS: { key: string; label: string }[] = [
    { key: "sunday", label: "ראשון" },
    { key: "monday", label: "שני" },
    { key: "tuesday", label: "שלישי" },
    { key: "wednesday", label: "רביעי" },
    { key: "thursday", label: "חמישי" },
    { key: "friday", label: "שישי" },
    { key: "saturday", label: "שבת" },
];

export default function OpeningHoursSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const business = (businessData || {}) as any;
    const businessId = business?._id;

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [openingHours, setOpeningHours] = useState<any>(
        business.openingHours || {}
    );
    const [savingOpeningHours, setSavingOpeningHours] = useState(false);

    useEffect(() => {
        setOpeningHours(business.openingHours || {});
    }, [business.openingHours]);

    if (!businessId) {
        return null;
    }

    const handleOpeningHourChange = (
        dayKey: string,
        field: "open" | "close",
        value: string
    ) => {
        setOpeningHours((prev: any) => ({
            ...prev,
            [dayKey]: {
                ...(prev?.[dayKey] || { open: "", close: "" }),
                [field]: value,
            },
        }));
    };

    const handleClearDay = (dayKey: string) => {
        setOpeningHours((prev: any) => ({
            ...prev,
            [dayKey]: { open: null, close: null },
        }));
    };

    const handleSaveOpeningHours = async () => {
        try {
            setSavingOpeningHours(true);

            const res = await fetch(
                `${URL}/businesses/${businessId}/opening-hours`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ openingHours }),
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 save openingHours response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("save openingHours error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לשמור שעות פתיחה כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "שעות הפתיחה נשמרו.");
        } catch (err) {
            console.log("save openingHours error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירת שעות הפתיחה.");
        } finally {
            setSavingOpeningHours(false);
        }
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>שעות פתיחה</Text>
            <Text style={styles.cardSubtitle}>
                פורמט: HH:MM (לדוגמה 09:00). אפשר להשאיר ריק או ללחוץ "סגור יום"
                אם סגור.
            </Text>

            <View style={{ marginTop: 8, gap: 8 }}>
                {DAY_LABELS.map(({ key, label }) => {
                    const dayObj = openingHours?.[key] || {
                        open: "",
                        close: "",
                    };
                    const isClosed =
                        dayObj.open == null && dayObj.close == null;

                    return (
                        <View key={key} style={styles.openingRow}>
                            <Text style={styles.openingDayLabel}>{label}</Text>
                            <View style={styles.openingInputs}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardSubtitle}>
                                        פתיחה
                                    </Text>
                                    <TextInput
                                        value={dayObj.open ?? ""}
                                        onChangeText={(val) =>
                                            handleOpeningHourChange(
                                                key,
                                                "open",
                                                val
                                            )
                                        }
                                        placeholder="09:00"
                                        style={[
                                            styles.inputSmall,
                                            isClosed && { opacity: 0.5 },
                                        ]}
                                        editable={!isClosed}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardSubtitle}>
                                        סגירה
                                    </Text>
                                    <TextInput
                                        value={dayObj.close ?? ""}
                                        onChangeText={(val) =>
                                            handleOpeningHourChange(
                                                key,
                                                "close",
                                                val
                                            )
                                        }
                                        placeholder="17:00"
                                        style={[
                                            styles.inputSmall,
                                            isClosed && { opacity: 0.5 },
                                        ]}
                                        editable={!isClosed}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.closeDayButton,
                                    isClosed && styles.closeDayButtonActive,
                                ]}
                                onPress={() => handleClearDay(key)}
                            >
                                <Text style={styles.closeDayButtonText}>
                                    {isClosed ? "יום סגור" : "סגור יום"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { backgroundColor: colorsSafe.primary, marginTop: 12 },
                ]}
                onPress={handleSaveOpeningHours}
                disabled={savingOpeningHours}
            >
                {savingOpeningHours ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.actionButtonText}>
                        שמירת שעות פתיחה
                    </Text>
                )}
            </TouchableOpacity>
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
    openingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    openingDayLabel: {
        width: 60,
        fontSize: 14,
        fontWeight: "500",
    },
    openingInputs: {
        flex: 1,
        flexDirection: "row",
        gap: 8,
    },
    inputSmall: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        backgroundColor: "#f9fafb",
        textAlign: "center",
    },
    closeDayButton: {
        marginLeft: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
        borderWidth: 1,
        borderColor: "#d1d5db",
    },
    closeDayButtonActive: {
        backgroundColor: "#fee2e2",
        borderColor: "#ef4444",
    },
    closeDayButtonText: {
        fontSize: 12,
        color: "#374151",
        fontWeight: "500",
    },
    actionButton: {
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
});

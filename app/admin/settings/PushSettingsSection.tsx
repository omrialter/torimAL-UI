// app/admin/settings/PushSettingsSection.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useBusinessDataContext } from "@/contexts/BusinessDataContext"; // לקבלת הצבעים
import { apiGet, apiPatch, apiPost } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type AdminPushSettings = {
    enabled: boolean;
    onAppointmentCreated: boolean;
    onAppointmentCanceled: boolean;
    onUserSignup: boolean;
};

const DEFAULT_SETTINGS: AdminPushSettings = {
    enabled: true,
    onAppointmentCreated: true,
    onAppointmentCanceled: true,
    onUserSignup: true,
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function PushSettingsSection() {
    const { colors } = useBusinessDataContext();
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
    };

    // --- State: Broadcast ---
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    // --- State: Settings ---
    const [settings, setSettings] = useState<AdminPushSettings>(DEFAULT_SETTINGS);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const adminPushEnabled = settings.enabled;

    // --- Load Settings ---
    const loadSettings = useCallback(async () => {
        try {
            setLoadingSettings(true);
            const res = await apiGet<any>("/users/admin/push-settings");

            const s = res?.adminPushSettings || {};
            setSettings({
                enabled: typeof s.enabled === "boolean" ? s.enabled : true,
                onAppointmentCreated: typeof s.onAppointmentCreated === "boolean" ? s.onAppointmentCreated : true,
                onAppointmentCanceled: typeof s.onAppointmentCanceled === "boolean" ? s.onAppointmentCanceled : true,
                onUserSignup: typeof s.onUserSignup === "boolean" ? s.onUserSignup : true,
            });
        } catch (err: any) {
            console.error(err);
            // לא מקפיצים אלרט בטעינה ראשונית כדי לא להציק, רק לוג
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // --- Handlers: Settings ---

    const patchSettings = useCallback(async (partial: Partial<AdminPushSettings>) => {
        // Optimistic update: מעדכנים את ה-UI מיד
        setSettings((prev) => ({ ...prev, ...partial }));

        try {
            setSavingSettings(true);
            const res = await apiPatch("/users/admin/push-settings", partial);

            // אם השרת החזיר את האובייקט המעודכן, נסנכרן ליתר ביטחון
            if (res?.adminPushSettings) {
                // (אפשר גם לוותר על זה אם סומכים על ה-Optimistic)
            }
        } catch (err: any) {
            console.error("Patch settings error:", err);
            Alert.alert("שגיאה", "לא הצלחנו לשמור את השינוי.");
            // Revert changes on error
            loadSettings();
        } finally {
            setSavingSettings(false);
        }
    }, [loadSettings]);

    // --- Handlers: Broadcast ---

    const sendBroadcast = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert("חסר מידע", "יש למלא כותרת ותוכן להודעה.");
            return;
        }

        Alert.alert(
            "שליחת הודעה לכולם",
            "ההודעה תישלח לכל הלקוחות של העסק. להמשיך?",
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "שלח",
                    onPress: async () => {
                        try {
                            setSending(true);
                            const res = await apiPost<any>("/users/admin/push", {
                                title: title.trim(),
                                body: body.trim(),
                                // data: { screen: "MyAppointments" } // אופציונלי לעתיד
                            });

                            Alert.alert(
                                "נשלח בהצלחה",
                                `נשלח אל ${res.successCount ?? "?"} מכשירים.`
                            );

                            setTitle("");
                            setBody("");
                        } catch (err: any) {
                            console.error(err);
                            Alert.alert("שגיאה", err.message || "תקלה בשליחת ההודעה.");
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    // --- Render Helpers ---

    const disabledMessage = useMemo(() => {
        if (!adminPushEnabled) return "ההתראות הראשיות כבויות, ולכן לא תקבל עדכונים ספציפיים.";
        return null;
    }, [adminPushEnabled]);

    return (
        <View style={styles.container}>

            {/* --- Card 1: Admin Preferences --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>הגדרות התראות מנהל</Text>
                <Text style={styles.cardSubtitle}>
                    בחר אילו עדכונים ברצונך לקבל לטלפון שלך כמנהל.
                </Text>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>קבלת התראות מערכת</Text>
                    {loadingSettings ? (
                        <ActivityIndicator size="small" />
                    ) : (
                        <Switch
                            value={settings.enabled}
                            onValueChange={(v) => patchSettings({ enabled: v })}
                            trackColor={{ false: "#e5e7eb", true: colorsSafe.primary }}
                        />
                    )}
                </View>

                <View style={styles.divider} />

                <View style={[styles.row, !adminPushEnabled && styles.disabledRow]}>
                    <Text style={styles.rowLabel}>תור חדש נקבע</Text>
                    <Switch
                        value={settings.onAppointmentCreated}
                        onValueChange={(v) => patchSettings({ onAppointmentCreated: v })}
                        disabled={!adminPushEnabled}
                        trackColor={{ false: "#e5e7eb", true: colorsSafe.primary }}
                    />
                </View>

                <View style={[styles.row, !adminPushEnabled && styles.disabledRow]}>
                    <Text style={styles.rowLabel}>תור בוטל ע"י לקוח</Text>
                    <Switch
                        value={settings.onAppointmentCanceled}
                        onValueChange={(v) => patchSettings({ onAppointmentCanceled: v })}
                        disabled={!adminPushEnabled}
                        trackColor={{ false: "#e5e7eb", true: colorsSafe.primary }}
                    />
                </View>

                <View style={[styles.row, !adminPushEnabled && styles.disabledRow]}>
                    <Text style={styles.rowLabel}>לקוח חדש נרשם</Text>
                    <Switch
                        value={settings.onUserSignup}
                        onValueChange={(v) => patchSettings({ onUserSignup: v })}
                        disabled={!adminPushEnabled}
                        trackColor={{ false: "#e5e7eb", true: colorsSafe.primary }}
                    />
                </View>

                {disabledMessage && (
                    <Text style={styles.hintText}>{disabledMessage}</Text>
                )}
            </View>

            {/* --- Card 2: Broadcast to Users --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>שליחת הודעה ללקוחות</Text>
                <Text style={styles.cardSubtitle}>
                    הודעת Push שתישלח לכל הלקוחות הרשומים (למשל: מבצעים, שינויים).
                </Text>

                <Text style={styles.inputLabel}>כותרת</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="לדוגמה: מבצע סופ''ש! 🎉"
                    style={styles.input}
                    textAlign="right"
                />

                <Text style={styles.inputLabel}>תוכן ההודעה</Text>
                <TextInput
                    value={body}
                    onChangeText={setBody}
                    placeholder="תוכן ההודעה..."
                    style={[styles.input, styles.textArea]}
                    textAlign="right"
                    multiline
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colorsSafe.primary }]}
                    onPress={sendBroadcast}
                    disabled={sending}
                >
                    {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>שליחה לכולם</Text>}
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
        textAlign: "right",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "right",
        marginBottom: 16,
    },

    // Toggles Rows
    row: {
        flexDirection: "row-reverse", // RTL: Text right, Switch left
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
    },
    disabledRow: {
        opacity: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: "#f3f4f6",
        marginVertical: 8,
    },
    hintText: {
        fontSize: 12,
        color: "#ef4444", // Red hint
        marginTop: 8,
        textAlign: "right",
    },

    // Inputs
    inputLabel: {
        fontSize: 13,
        fontWeight: "500",
        marginBottom: 6,
        color: "#374151",
        textAlign: "right",
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: "#f9fafb",
        marginBottom: 12,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    button: {
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
});
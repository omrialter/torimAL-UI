import { apiGet, apiPatch, apiPost } from "@/services/api";
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

export default function AdminPushBroadcastScreen() {
    // Broadcast state
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    // Settings state
    const [settings, setSettings] = useState<AdminPushSettings>(DEFAULT_SETTINGS);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const adminPushEnabled = settings.enabled;

    const loadSettings = useCallback(async () => {
        try {
            setLoadingSettings(true);
            const res = await apiGet("/users/admin/push-settings");
            const s = res?.adminPushSettings || {};
            setSettings({
                enabled: typeof s.enabled === "boolean" ? s.enabled : true,
                onAppointmentCreated:
                    typeof s.onAppointmentCreated === "boolean" ? s.onAppointmentCreated : true,
                onAppointmentCanceled:
                    typeof s.onAppointmentCanceled === "boolean" ? s.onAppointmentCanceled : true,
                onUserSignup: typeof s.onUserSignup === "boolean" ? s.onUserSignup : true,
            });
        } catch (err: any) {
            console.error(err);
            Alert.alert("שגיאה", err?.message || "לא הצלחתי לטעון את הגדרות ההתראות");
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const patchSettings = useCallback(async (partial: Partial<AdminPushSettings>) => {
        // optimistic update: update UI, then patch. If failed, revert by reloading.
        setSettings((prev) => ({ ...prev, ...partial }));
        try {
            setSavingSettings(true);
            const res = await apiPatch("/users/admin/push-settings", partial);
            if (res?.adminPushSettings) {
                setSettings({
                    enabled: !!res.adminPushSettings.enabled,
                    onAppointmentCreated: !!res.adminPushSettings.onAppointmentCreated,
                    onAppointmentCanceled: !!res.adminPushSettings.onAppointmentCanceled,
                    onUserSignup: !!res.adminPushSettings.onUserSignup,
                });
            }
        } catch (err: any) {
            console.error(err);
            Alert.alert("שגיאה", err?.message || "לא הצלחתי לשמור את ההגדרות");
            // revert to server state
            loadSettings();
        } finally {
            setSavingSettings(false);
        }
    }, [loadSettings]);

    const disabledReasons = useMemo(() => {
        if (!adminPushEnabled) return "התראות לאדמין כבויות בהגדרות";
        return "";
    }, [adminPushEnabled]);

    const sendBroadcast = async () => {
        try {
            if (!title.trim() || !body.trim()) {
                Alert.alert("חסר מידע", "יש למלא כותרת ותוכן הודעה");
                return;
            }

            setSending(true);

            const res = await apiPost("/users/admin/push", {
                title: title.trim(),
                body: body.trim(),
                data: { screen: "MyAppointments" }, // אופציונלי: ניווט בעת לחיצה
            });

            setSending(false);

            Alert.alert(
                "נשלח בהצלחה",
                `נשלח ל-${res.requestedTokens ?? res.totalTokens ?? "?"} משתמשים\nהצלחות: ${res.successCount ?? "?"}\nכשלונות: ${res.failCount ?? "?"}`
            );

            setTitle("");
            setBody("");
        } catch (err: any) {
            setSending(false);
            console.error(err);
            Alert.alert("שגיאה", err.message || "שגיאה בשליחה");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>התראות PUSH לאדמין</Text>

            {/* Settings Card */}
            <View style={styles.card}>
                <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>קבלת התראות לאדמין</Text>
                        <Text style={styles.cardSubTitle}>
                            קובע אם תקבל התראות על פעולות במערכת (רישום, קביעת תור, ביטול תור)
                        </Text>
                    </View>

                    {loadingSettings ? (
                        <ActivityIndicator />
                    ) : (
                        <Switch
                            value={settings.enabled}
                            onValueChange={(v) => patchSettings({ enabled: v })}
                            disabled={savingSettings}
                        />
                    )}
                </View>

                <View style={styles.divider} />

                {/* Per-event toggles */}
                <View style={[styles.rowBetween, !adminPushEnabled && styles.rowDisabled]}>
                    <Text style={styles.toggleLabel}>תור חדש נקבע</Text>
                    <Switch
                        value={settings.onAppointmentCreated}
                        onValueChange={(v) => patchSettings({ onAppointmentCreated: v })}
                        disabled={!adminPushEnabled || loadingSettings || savingSettings}
                    />
                </View>

                <View style={[styles.rowBetween, !adminPushEnabled && styles.rowDisabled]}>
                    <Text style={styles.toggleLabel}>תור בוטל</Text>
                    <Switch
                        value={settings.onAppointmentCanceled}
                        onValueChange={(v) => patchSettings({ onAppointmentCanceled: v })}
                        disabled={!adminPushEnabled || loadingSettings || savingSettings}
                    />
                </View>

                <View style={[styles.rowBetween, !adminPushEnabled && styles.rowDisabled]}>
                    <Text style={styles.toggleLabel}>נרשם משתמש חדש</Text>
                    <Switch
                        value={settings.onUserSignup}
                        onValueChange={(v) => patchSettings({ onUserSignup: v })}
                        disabled={!adminPushEnabled || loadingSettings || savingSettings}
                    />
                </View>

                {!!disabledReasons ? (
                    <Text style={styles.smallHint}>{disabledReasons}</Text>
                ) : savingSettings ? (
                    <Text style={styles.smallHint}>שומר הגדרות…</Text>
                ) : null}
            </View>

            {/* Broadcast section */}
            <Text style={[styles.header, { marginTop: 14 }]}>שליחת הודעת PUSH לכל הלקוחות</Text>

            <Text style={styles.label}>כותרת</Text>
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="לדוגמה: תזכורת חשובה"
                style={styles.input}
                maxLength={80}
            />

            <Text style={styles.label}>תוכן הודעה</Text>
            <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="כתוב כאן את ההודעה..."
                style={[styles.input, styles.textArea]}
                multiline
                maxLength={180}
            />

            <TouchableOpacity style={styles.button} onPress={sendBroadcast} disabled={sending}>
                {sending ? <ActivityIndicator /> : <Text style={styles.buttonText}>שלח לכל המשתמשים</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>
                ההודעה תישלח לכל המשתמשים בעסק שיש להם Push Token שמור.
                {"\n"}
                ההגדרות למעלה משפיעות רק על התראות שהמערכת שולחת לאדמינים (רישום/תור/ביטול), לא על Broadcast.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },

    header: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

    card: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        padding: 14,
        backgroundColor: "#fafafa",
    },
    cardTitle: { fontSize: 15, fontWeight: "800" },
    cardSubTitle: { marginTop: 4, fontSize: 12, color: "#6b7280", lineHeight: 16 },

    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 8,
    },
    rowDisabled: {
        opacity: 0.5,
    },

    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginVertical: 10,
    },

    toggleLabel: { fontSize: 14, fontWeight: "600" },

    smallHint: { marginTop: 8, color: "#6b7280", fontSize: 12, lineHeight: 16 },

    label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        fontSize: 14,
        backgroundColor: "#fff",
    },
    textArea: { minHeight: 110, textAlignVertical: "top" },

    button: {
        backgroundColor: "#111827",
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 6,
    },
    buttonText: { color: "#fff", fontWeight: "700" },

    hint: { marginTop: 14, color: "#6b7280", fontSize: 12, lineHeight: 18 },
});

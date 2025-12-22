import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type TicketType = "bug" | "help" | "idea";
type Priority = "low" | "medium" | "high" | "urgent";

type SupportPayload = {
    type: TicketType;
    priority: Priority;
    title: string;
    description: string;
    attachments: { uri: string; kind: "image" }[];
    context: {
        appVersion: string | null;
        platform: "ios" | "android" | "unknown";
        lastScreen: string;
    };
    // העתידי: fields של ClickUp mapping (tags, customFields, listId...)
};

export default function AdminSupportScreen() {
    const [type, setType] = useState<TicketType>("bug");
    const [priority, setPriority] = useState<Priority>("medium");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [attachments, setAttachments] = useState<{ uri: string; kind: "image" }[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const canSubmit = useMemo(() => {
        return title.trim().length >= 2 && description.trim().length >= 10 && !loading;
    }, [title, description, loading]);

    const payload: SupportPayload = useMemo(() => {
        const platform: SupportPayload["context"]["platform"] =
            Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";

        return {
            type,
            priority,
            title: title.trim(),
            description: description.trim(),
            attachments,
            context: {
                appVersion: Constants.expoConfig?.version ?? null,
                platform,
                lastScreen: "/admin/support",
            },
        };
    }, [type, priority, title, description, attachments]);

    async function pickImage() {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert("אין הרשאה", "צריך לאפשר גישה לגלריה כדי לצרף תמונה.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (result.canceled) return;

            const uri = result.assets?.[0]?.uri;
            if (!uri) return;

            setAttachments((prev) => [...prev, { uri, kind: "image" }]);
        } catch (e: any) {
            Alert.alert("שגיאה", e?.message || "לא הצלחנו לבחור תמונה.");
        }
    }

    function removeAttachment(uri: string) {
        setAttachments((prev) => prev.filter((a) => a.uri !== uri));
    }

    async function onSubmit() {
        if (!canSubmit) {
            Alert.alert("חסר מידע", "אנא מלא/י כותרת ותיאור מפורט (לפחות 10 תווים).");
            return;
        }

        // UI בלבד: כרגע לא שולחים לשרת ולא ל-DB.
        // בעתיד: פה תבצע קריאה לשרת שלך, והוא ידבר מול ClickUp.
        setLoading(true);
        try {
            await submitToClickUp(payload); // Stub
            Alert.alert("מוכן לשילוב", "כרגע זה UI בלבד. ברגע שתחבר ClickUp, זה ישלח קריאה אמיתית.");
            // reset
            setType("bug");
            setPriority("medium");
            setTitle("");
            setDescription("");
            setAttachments([]);
        } catch (e: any) {
            Alert.alert("שגיאה", e?.message || "לא הצלחנו לשלוח.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.h1}>תמיכה</Text>
            <Text style={styles.sub}>
                דיווח על תקלה, בקשת עזרה, או רעיון לשיפור. (כרגע UI בלבד — ללא שמירה בשרת)
            </Text>

            <View style={styles.card}>
                <Text style={styles.label}>סוג פנייה</Text>
                <View style={styles.row}>
                    <Pill text="תקלה" active={type === "bug"} onPress={() => setType("bug")} />
                    <Pill text="עזרה" active={type === "help"} onPress={() => setType("help")} />
                    <Pill text="רעיון" active={type === "idea"} onPress={() => setType("idea")} />
                </View>

                <Text style={[styles.label, styles.mt]}>דחיפות</Text>
                <View style={styles.row}>
                    <Pill text="נמוכה" active={priority === "low"} onPress={() => setPriority("low")} />
                    <Pill text="בינונית" active={priority === "medium"} onPress={() => setPriority("medium")} />
                    <Pill text="גבוהה" active={priority === "high"} onPress={() => setPriority("high")} />
                    <Pill text="דחוף" active={priority === "urgent"} onPress={() => setPriority("urgent")} />
                </View>

                <Text style={[styles.label, styles.mt]}>כותרת</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="לדוגמה: לא מצליח לקבוע תור"
                    style={styles.input}
                    maxLength={120}
                />

                <Text style={[styles.label, styles.mt]}>תיאור מפורט</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="מה ניסית לעשות? מה קרה בפועל? אם יש הודעת שגיאה—צרף/י."
                    style={[styles.input, styles.textarea]}
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                />

                <Text style={[styles.label, styles.mt]}>צרופות (אופציונלי)</Text>
                <View style={styles.row}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                        <Text style={styles.secondaryBtnText}>צרף צילום מסך</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPreviewOpen(true)}>
                        <Text style={styles.secondaryBtnText}>תצוגה מקדימה</Text>
                    </TouchableOpacity>
                </View>

                {attachments.length > 0 && (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        {attachments.map((a) => (
                            <View key={a.uri} style={styles.attachmentRow}>
                                <Image source={{ uri: a.uri }} style={styles.thumb} />
                                <Text style={styles.attachmentText} numberOfLines={1}>
                                    {a.uri}
                                </Text>
                                <TouchableOpacity onPress={() => removeAttachment(a.uri)} style={styles.removeBtn}>
                                    <Text style={styles.removeBtnText}>הסר</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.btn, !canSubmit && styles.btnDisabled]}
                    disabled={!canSubmit}
                    onPress={onSubmit}
                >
                    {loading ? <ActivityIndicator /> : <Text style={styles.btnText}>שלח פנייה</Text>}
                </TouchableOpacity>
            </View>

            <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} payload={payload} />
        </ScrollView>
    );
}

function Pill({
    text,
    active,
    onPress,
}: {
    text: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{text}</Text>
        </TouchableOpacity>
    );
}

function PreviewModal({
    open,
    onClose,
    payload,
}: {
    open: boolean;
    onClose: () => void;
    payload: any;
}) {
    return (
        <Modal visible={open} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalWrap}>
                <Text style={styles.modalTitle}>תצוגה מקדימה (Payload)</Text>
                <ScrollView style={styles.codeBox}>
                    <Text style={styles.codeText}>{JSON.stringify(payload, null, 2)}</Text>
                </ScrollView>

                <TouchableOpacity style={styles.btn} onPress={onClose}>
                    <Text style={styles.btnText}>סגור</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// Stub: בשלב הבא תחליף את זה לקריאה לשרת שלך.
// השרת שלך ידבר מול ClickUp (ולא ישמור אצלך DB).
async function submitToClickUp(payload: any) {
    console.log("Support payload (UI only):", payload);

    // לדוגמה: להדגים חיבור עתידי
    // throw new Error("ClickUp not connected yet");

    await new Promise((r) => setTimeout(r, 400));
    return true;
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    h1: { fontSize: 24, fontWeight: "800", marginBottom: 6, textAlign: "center" },
    sub: { fontSize: 13, opacity: 0.75, marginBottom: 14, textAlign: "right" },

    card: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },

    label: { fontSize: 12, fontWeight: "700", marginBottom: 12, opacity: 0.75, textAlign: "center" },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 },

    mt: { marginTop: 14 },

    pill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    pillActive: { borderColor: "#111827", backgroundColor: "#111827" },
    pillText: { fontSize: 12, fontWeight: "700", color: "#111827" },
    pillTextActive: { color: "#fff" },

    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    textarea: { height: 140 },

    btn: {
        marginTop: 16,
        backgroundColor: "#111827",
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: "#fff", fontWeight: "800" },

    secondaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#fff",
    },
    secondaryBtnText: { fontWeight: "800", opacity: 0.85 },

    attachmentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: "#eef2f7",
        borderRadius: 12,
        padding: 10,
    },
    thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#eee" },
    attachmentText: { flex: 1, fontSize: 12, opacity: 0.7 },

    removeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: "#111827",
    },
    removeBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

    modalWrap: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: "#fff" },
    modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
    codeBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    codeText: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 },
});

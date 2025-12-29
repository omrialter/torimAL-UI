// app/admin/settings/SupportSettingsSection.tsx
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

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type TicketType = "bug" | "help" | "idea";
type Priority = "low" | "medium" | "high" | "urgent";

interface SupportPayload {
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
}

// ----------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------

export default function SupportSettingsSection() {
    // State
    const [type, setType] = useState<TicketType>("bug");
    const [priority, setPriority] = useState<Priority>("medium");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState<{ uri: string; kind: "image" }[]>([]);

    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Computed
    const canSubmit = useMemo(() => {
        return title.trim().length >= 2 && description.trim().length >= 10 && !loading;
    }, [title, description, loading]);

    const payload: SupportPayload = useMemo(() => {
        const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";

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

    // Handlers
    const pickImage = async () => {
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

            if (!result.canceled && result.assets?.[0]?.uri) {
                setAttachments((prev) => [...prev, { uri: result.assets[0].uri, kind: "image" }]);
            }
        } catch (e: any) {
            Alert.alert("שגיאה", e?.message || "לא הצלחנו לבחור תמונה.");
        }
    };

    const removeAttachment = (uri: string) => {
        setAttachments((prev) => prev.filter((a) => a.uri !== uri));
    };

    const onSubmit = async () => {
        if (!canSubmit) {
            Alert.alert("חסר מידע", "אנא מלא/י כותרת ותיאור מפורט (לפחות 10 תווים).");
            return;
        }

        setLoading(true);
        try {
            // כאן תבוא האינטגרציה האמיתית בעתיד
            console.log("Submitting Support Ticket:", JSON.stringify(payload, null, 2));

            // סימולציה של שליחה
            await new Promise(resolve => setTimeout(resolve, 1000));

            Alert.alert("נשלח בהצלחה", "הפנייה התקבלה ותטופל בהקדם.");

            // Reset
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
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>תמיכה ודיווח</Text>
            <Text style={styles.subtitle}>
                נתקלת בבאג? יש לך רעיון? שלח לנו דיווח מפורט.
            </Text>

            <View style={styles.card}>
                {/* Type Selection */}
                <Text style={styles.label}>סוג פנייה</Text>
                <View style={styles.row}>
                    <Pill text="תקלה 🐛" active={type === "bug"} onPress={() => setType("bug")} />
                    <Pill text="עזרה ❓" active={type === "help"} onPress={() => setType("help")} />
                    <Pill text="רעיון 💡" active={type === "idea"} onPress={() => setType("idea")} />
                </View>

                {/* Priority Selection */}
                <Text style={[styles.label, styles.mt]}>דחיפות</Text>
                <View style={styles.row}>
                    <Pill text="נמוכה" active={priority === "low"} onPress={() => setPriority("low")} />
                    <Pill text="רגילה" active={priority === "medium"} onPress={() => setPriority("medium")} />
                    <Pill text="גבוהה" active={priority === "high"} onPress={() => setPriority("high")} />
                    <Pill text="דחוף 🔥" active={priority === "urgent"} onPress={() => setPriority("urgent")} />
                </View>

                {/* Form Inputs */}
                <Text style={[styles.label, styles.mt]}>כותרת</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="לדוגמה: לא מצליח לקבוע תור"
                    style={styles.input}
                    maxLength={120}
                    textAlign="right"
                />

                <Text style={[styles.label, styles.mt]}>תיאור מפורט</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="מה ניסית לעשות? מה קרה בפועל? צרף הודעת שגיאה אם יש."
                    style={[styles.input, styles.textarea]}
                    multiline
                    textAlignVertical="top"
                    textAlign="right"
                    maxLength={5000}
                />

                {/* Attachments */}
                <Text style={[styles.label, styles.mt]}>צרופות (אופציונלי)</Text>
                <View style={styles.row}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                        <Text style={styles.secondaryBtnText}>📷 צרף תמונה</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPreviewOpen(true)}>
                        <Text style={styles.secondaryBtnText}>👁️ תצוגה מקדימה</Text>
                    </TouchableOpacity>
                </View>

                {attachments.length > 0 && (
                    <View style={styles.attachmentsList}>
                        {attachments.map((a) => (
                            <View key={a.uri} style={styles.attachmentItem}>
                                <Image source={{ uri: a.uri }} style={styles.attachmentThumb} />
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                    {a.uri.split('/').pop()}
                                </Text>
                                <TouchableOpacity onPress={() => removeAttachment(a.uri)} style={styles.removeBtn}>
                                    <Text style={styles.removeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    disabled={!canSubmit}
                    onPress={onSubmit}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>שלח פנייה</Text>
                    )}
                </TouchableOpacity>
            </View>

            <PreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                payload={payload}
            />
        </ScrollView>
    );
}

// --- Sub Components ---

function Pill({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{text}</Text>
        </TouchableOpacity>
    );
}

function PreviewModal({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: any }) {
    return (
        <Modal visible={open} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>תצוגה מקדימה (JSON Payload)</Text>
                <ScrollView style={styles.jsonBox}>
                    <Text style={styles.jsonText}>{JSON.stringify(payload, null, 2)}</Text>
                </ScrollView>
                <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                    <Text style={styles.closeModalBtnText}>סגור</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// --- Styles ---

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 4,
        color: "#111",
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
        textAlign: "right",
    },
    mt: {
        marginTop: 16,
    },
    row: {
        flexDirection: "row-reverse", // RTL
        flexWrap: "wrap",
        gap: 8,
    },

    // Pill
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        backgroundColor: "#f3f4f6",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    pillActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    pillText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
    },
    pillTextActive: {
        color: "#fff",
    },

    // Inputs
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: "#fff",
    },
    textarea: {
        height: 120,
    },

    // Buttons
    secondaryBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    secondaryBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
    },
    submitBtn: {
        marginTop: 24,
        backgroundColor: "#111",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },

    // Attachments
    attachmentsList: {
        marginTop: 12,
        gap: 8,
    },
    attachmentItem: {
        flexDirection: "row-reverse",
        alignItems: "center",
        padding: 8,
        borderWidth: 1,
        borderColor: "#f3f4f6",
        borderRadius: 10,
        backgroundColor: "#f9fafb",
    },
    attachmentThumb: {
        width: 40,
        height: 40,
        borderRadius: 6,
        backgroundColor: "#e5e7eb",
        marginLeft: 10,
    },
    attachmentName: {
        flex: 1,
        fontSize: 12,
        color: "#4b5563",
        textAlign: "right",
    },
    removeBtn: {
        padding: 8,
        backgroundColor: "#fee2e2",
        borderRadius: 8,
    },
    removeBtnText: {
        color: "#b91c1c",
        fontSize: 12,
        fontWeight: "bold",
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
        paddingTop: 60,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
        textAlign: "center",
    },
    jsonBox: {
        flex: 1,
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    jsonText: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: "#374151",
    },
    closeModalBtn: {
        backgroundColor: "#111",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    closeModalBtnText: {
        color: "#fff",
        fontWeight: "700",
    },
});
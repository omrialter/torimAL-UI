// app/admin/settings/ServicesSettingsSection.tsx
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiDelete, apiPatch, apiPost } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface Service {
    _id: string;
    name: string;
    duration: number;
    price: number;
}

interface FormState {
    name: string;
    duration: string;
    price: string;
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function ServicesSettingsSection() {
    const { businessData, loading, refetch } = useBusinessDataContext();

    // המרה בטוחה
    const business = (businessData || {}) as any;
    const services: Service[] = useMemo(() => business.services || [], [business.services]);
    const businessId = business._id;

    // Form State
    const [form, setForm] = useState<FormState>({ name: "", duration: "", price: "" });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Loading States
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // --- Helpers ---

    const onChangeField = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const resetForm = () => {
        setForm({ name: "", duration: "", price: "" });
        setEditingId(null);
    };

    const startEdit = (service: Service) => {
        setEditingId(service._id);
        setForm({
            name: service.name,
            duration: String(service.duration),
            price: String(service.price),
        });
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            Alert.alert("שגיאה", "שם השירות הוא חובה");
            return false;
        }

        const durationNum = Number(form.duration);
        const priceNum = Number(form.price);

        if (isNaN(durationNum) || durationNum <= 0) {
            Alert.alert("שגיאה", "משך השירות (בדקות) חייב להיות מספר גדול מ-0");
            return false;
        }
        if (isNaN(priceNum) || priceNum < 0) {
            Alert.alert("שגיאה", "מחיר חייב להיות מספר גדול או שווה ל-0");
            return false;
        }

        return true;
    };

    // --- Handlers ---

    const handleSave = async () => {
        if (!businessId) return;
        if (!validateForm()) return;

        setSaving(true);

        const payload = {
            name: form.name.trim(),
            duration: Number(form.duration),
            price: Number(form.price),
        };

        try {
            if (editingId) {
                // Update Existing
                await apiPatch(`/businesses/${businessId}/services/${editingId}`, payload);
            } else {
                // Create New
                await apiPost(`/businesses/${businessId}/services`, payload);
            }

            await refetch();
            resetForm();

        } catch (err: any) {
            console.error("Save service error:", err);
            const msg = err.payload?.error || err.message || "אירעה שגיאה בשמירה.";
            Alert.alert("שגיאה", msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (service: Service) => {
        Alert.alert(
            "מחיקת שירות",
            `האם למחוק את השירות "${service.name}"?`,
            [
                { text: "בטל", style: "cancel" },
                {
                    text: "מחק",
                    style: "destructive",
                    onPress: async () => {
                        if (!businessId) return;
                        setDeletingId(service._id);

                        try {
                            await apiDelete(`/businesses/${businessId}/services/${service._id}`);
                            await refetch();

                            if (editingId === service._id) {
                                resetForm();
                            }
                        } catch (err: any) {
                            console.error("Delete service error:", err);
                            Alert.alert("שגיאה", "לא ניתן למחוק את השירות.");
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    if (loading && !businessData) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>שירותים</Text>
                <ActivityIndicator style={{ marginTop: 8 }} />
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>שירותים</Text>
            <Text style={styles.subtitle}>
                ניהול רשימת השירותים שלך: תספורת, זקן, קומבו ועוד.
            </Text>

            {/* --- Form --- */}
            <View style={styles.form}>
                <View style={styles.fieldRow}>
                    <Text style={styles.label}>שם השירות</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="לדוגמה: תספורת + זקן"
                        value={form.name}
                        onChangeText={(t) => onChangeField("name", t)}
                        textAlign="right"
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.fieldRow, styles.rowItem]}>
                        <Text style={styles.label}>משך (דקות)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="30"
                            keyboardType="numeric"
                            value={form.duration}
                            onChangeText={(t) => onChangeField("duration", t)}
                            textAlign="center"
                        />
                    </View>

                    <View style={[styles.fieldRow, styles.rowItem]}>
                        <Text style={styles.label}>מחיר (₪)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="80"
                            keyboardType="numeric"
                            value={form.price}
                            onChangeText={(t) => onChangeField("price", t)}
                            textAlign="center"
                        />
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    {editingId && (
                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={resetForm}
                            disabled={saving}
                        >
                            <Text style={styles.secondaryButtonText}>ביטול</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {editingId ? "שמור שינויים" : "הוסף שירות"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- List --- */}
            <View style={styles.listWrapper}>
                <Text style={styles.listTitle}>שירותים קיימים</Text>

                {services.length === 0 ? (
                    <Text style={styles.emptyText}>עדיין לא הוגדרו שירותים.</Text>
                ) : (
                    services.map((service) => (
                        <View key={service._id} style={styles.serviceRow}>

                            <View style={styles.serviceInfo}>
                                <Text style={styles.serviceName}>{service.name}</Text>
                                <Text style={styles.serviceMeta}>
                                    משך: {service.duration} דק'  |  מחיר: {service.price} ₪
                                </Text>
                            </View>

                            <View style={styles.serviceActions}>
                                <TouchableOpacity
                                    style={[styles.smallButton, styles.editButton]}
                                    onPress={() => startEdit(service)}
                                >
                                    <Text style={styles.editButtonText}>עריכה</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.smallButton, styles.deleteButton]}
                                    onPress={() => handleDelete(service)}
                                    disabled={deletingId === service._id}
                                >
                                    {deletingId === service._id ? (
                                        <ActivityIndicator size="small" color="#b91c1c" />
                                    ) : (
                                        <Text style={styles.deleteButtonText}>מחיקה</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                        </View>
                    ))
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
        textAlign: "right",
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 12,
        textAlign: "right",
    },

    // Form
    form: {
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        paddingTop: 12,
        marginTop: 4,
    },
    fieldRow: {
        marginBottom: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: "500",
        marginBottom: 4,
        color: "#374151",
        textAlign: "right",
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: "#f9fafb",
    },
    row: {
        flexDirection: "row-reverse", // RTL
        gap: 8,
    },
    rowItem: {
        flex: 1,
    },

    // תוקן כאן: ניקוי הכפילויות והערות המיותרות
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButton: {
        backgroundColor: "#1d4ed8",
    },
    primaryButtonText: {
        color: "#ffffff",
        fontWeight: "600",
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: "#f3f4f6",
    },
    secondaryButtonText: {
        color: "#374151",
        fontWeight: "500",
        fontSize: 14,
    },

    // List
    listWrapper: {
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        paddingTop: 16,
        marginTop: 16,
    },
    listTitle: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "right",
    },
    emptyText: {
        fontSize: 13,
        color: "#9ca3af",
        textAlign: "center",
        fontStyle: 'italic',
        marginVertical: 10,
    },
    serviceRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    serviceInfo: {
        flex: 1,
        alignItems: 'flex-end', // RTL alignment
    },
    serviceName: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
        color: "#111",
    },
    serviceMeta: {
        fontSize: 12,
        color: "#6b7280",
    },
    serviceActions: {
        flexDirection: "row",
        gap: 8,
        marginRight: 10, // Space from info
    },
    smallButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editButton: {
        backgroundColor: "#eff6ff",
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2563eb",
    },
    deleteButton: {
        backgroundColor: "#fee2e2",
    },
    deleteButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#dc2626",
    },
});
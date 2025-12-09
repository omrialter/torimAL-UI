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
import { URL, apiFetch } from "@/services/api";

type Service = {
    _id: string;
    name: string;
    duration: number | string;
    price: number | string;
};

type FormState = {
    name: string;
    duration: string;
    price: string;
};

export default function ServicesSettingsSection() {
    const { businessData, loading, refetch } = useBusinessDataContext();

    const [form, setForm] = useState<FormState>({
        name: "",
        duration: "",
        price: "",
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const services: Service[] = useMemo(
        () => ((businessData as any)?.services as Service[]) || [],
        [businessData]
    );

    const businessId = (businessData as any)?._id as string | undefined;

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

        if (Number.isNaN(durationNum) || durationNum <= 0) {
            Alert.alert("שגיאה", "משך השירות (בדקות) חייב להיות מספר גדול מ-0");
            return false;
        }
        if (Number.isNaN(priceNum) || priceNum < 0) {
            Alert.alert("שגיאה", "מחיר חייב להיות מספר גדול או שווה ל-0");
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!businessId) {
            console.warn("❌ handleSave: missing businessId");
            return;
        }
        if (!validateForm()) return;

        try {
            setSaving(true);

            const durationNum = Number(form.duration);
            const priceNum = Number(form.price);

            if (editingId) {
                // עדכון שירות קיים
                const body: any = {};
                if (form.name.trim() !== "") body.name = form.name.trim();
                body.duration = durationNum;
                body.price = priceNum;

                const url = `${URL}/businesses/${businessId}/services/${editingId}`;
                console.log("📝 PATCH service →", url, body);

                const res = await apiFetch(url, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                const text = await res.text();
                console.log("📝 PATCH service response:", res.status, text);

                if (!res.ok) {
                    throw new Error(text || `PATCH_FAILED_${res.status}`);
                }
            } else {
                // יצירת שירות חדש – בלי _id, השרת מייצר ObjectId
                const body = {
                    name: form.name.trim(),
                    duration: durationNum,
                    price: priceNum,
                };

                const url = `${URL}/businesses/${businessId}/services`;
                console.log("➕ POST service →", url, body);

                const res = await apiFetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                const text = await res.text();
                console.log("➕ POST service response:", res.status, text);

                if (!res.ok) {
                    throw new Error(text || `POST_FAILED_${res.status}`);
                }
            }

            await refetch();
            resetForm();
        } catch (err: any) {
            console.error("save service error:", err);
            Alert.alert(
                "שגיאה",
                err?.message || "אירעה שגיאה בשמירת השירות, נסה שוב"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (service: Service) => {
        Alert.alert(
            "מחיקת שירות",
            `האם אתה בטוח שברצונך למחוק את השירות "${service.name}"?`,
            [
                { text: "בטל", style: "cancel" },
                {
                    text: "מחק",
                    style: "destructive",
                    onPress: () => confirmDelete(service),
                },
            ]
        );
    };

    const confirmDelete = async (service: Service) => {
        if (!businessId) {
            console.warn("❌ confirmDelete: missing businessId");
            return;
        }

        try {
            setDeletingId(service._id);

            const url = `${URL}/businesses/${businessId}/services/${service._id}`;
            console.log("🗑 DELETE service →", url);

            const res = await apiFetch(url, {
                method: "DELETE",
            });

            const text = await res.text();
            console.log("🗑 DELETE service response:", res.status, text);

            if (!res.ok) {
                throw new Error(text || `DELETE_FAILED_${res.status}`);
            }

            await refetch();
            if (editingId === service._id) {
                resetForm();
            }
        } catch (err: any) {
            console.error("delete service error:", err);
            Alert.alert(
                "שגיאה",
                err?.message || "אירעה שגיאה במחיקת השירות, נסה שוב"
            );
        } finally {
            setDeletingId(null);
        }
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

            {/* טופס הוספה / עריכה */}
            <View style={styles.form}>
                <View style={styles.fieldRow}>
                    <Text style={styles.label}>שם השירות</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="לדוגמה: תספורת + זקן"
                        value={form.name}
                        onChangeText={(t) => onChangeField("name", t)}
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
                            <Text style={styles.secondaryButtonText}>ביטול עריכה</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {editingId ? "שמור שירות" : "הוסף שירות"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* רשימת שירותים קיימים */}
            <View style={styles.listWrapper}>
                <Text style={styles.listTitle}>שירותים קיימים</Text>
                {services.length === 0 ? (
                    <Text style={styles.emptyText}>
                        עדיין לא הוגדרו שירותים לעסק הזה.
                    </Text>
                ) : (
                    services.map((service) => (
                        <View key={service._id} style={styles.serviceRow}>
                            <View style={styles.serviceInfo}>
                                <Text style={styles.serviceName}>{service.name}</Text>
                                {/* אפשר להשאיר את המזהה רק לצורך דיבוג */}
                                <Text style={styles.serviceMeta}>
                                    מזהה פנימי: {service._id}
                                </Text>
                                <Text style={styles.serviceMeta}>
                                    משך: {service.duration} דקות · מחיר: {service.price} ₪
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
                                        <ActivityIndicator size="small" />
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
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 12,
    },
    form: {
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
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
    },
    input: {
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: "#f9fafb",
    },
    row: {
        flexDirection: "row",
        gap: 8,
    },
    rowItem: {
        flex: 1,
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
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
        backgroundColor: "#e5e7eb",
    },
    secondaryButtonText: {
        color: "#111827",
        fontWeight: "500",
        fontSize: 13,
    },
    listWrapper: {
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 12,
        marginTop: 12,
    },
    listTitle: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: "#6b7280",
    },
    serviceRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    serviceInfo: {
        flex: 1,
        paddingRight: 8,
    },
    serviceName: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    serviceMeta: {
        fontSize: 12,
        color: "#6b7280",
    },
    serviceActions: {
        flexDirection: "row",
        gap: 6,
    },
    smallButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
    },
    editButton: {
        backgroundColor: "#e0f2fe",
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0369a1",
    },
    deleteButton: {
        backgroundColor: "#fee2e2",
    },
    deleteButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#b91c1c",
    },
});

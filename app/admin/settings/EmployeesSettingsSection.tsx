// app/admin/settings/EmployeesSettingsSection.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiDelete, apiPost } from "@/services/api"; // שימוש ב-Service

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface Worker {
    _id: string;
    name: string;
    phone: string;
    avatarUrl?: string;
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function EmployeesSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth(); // למקרה שצריך אותו, למרות שה-api wrappers מטפלים בזה

    // המרה בטוחה יותר לטיפוס
    const business = businessData as any;
    const businessId = business?._id;
    const workers: Worker[] = business?.workers || [];

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    // State
    const [modalVisible, setModalVisible] = useState(false);
    const [newWorkerPhone, setNewWorkerPhone] = useState("");
    const [addingWorker, setAddingWorker] = useState(false);
    const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);

    // --- Handlers ---

    const handleAddWorker = async () => {
        if (!newWorkerPhone.trim()) {
            Alert.alert("שגיאה", "נא להזין מספר טלפון.");
            return;
        }

        setAddingWorker(true);

        try {
            // שימוש ב-apiPost במקום fetch ישיר
            const res = await apiPost(
                `/businesses/${businessId}/workers`,
                { phone: newWorkerPhone }
            );

            // apiPost זורק שגיאה אם הסטטוס לא תקין, כך שאם הגענו לפה - הכל בסדר
            await refetch();
            setNewWorkerPhone("");
            setModalVisible(false);
            Alert.alert("הצלחה", "העובד נוסף בהצלחה לעסק.");

        } catch (err: any) {
            console.error("Add worker error:", err);
            // חילוץ הודעת שגיאה מהמנגנון של ה-Service
            const msg = err.payload?.msg || err.payload?.error || err.message || "לא ניתן להוסיף עובד.";
            Alert.alert("שגיאה", msg);
        } finally {
            setAddingWorker(false);
        }
    };

    const handleRemoveWorker = (workerId: string, workerName: string) => {
        Alert.alert(
            "מחיקת עובד",
            `האם אתה בטוח שברצונך להסיר את ${workerName} מהעסק?`,
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "הסר",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingWorkerId(workerId);
                        try {
                            // שימוש ב-apiDelete
                            await apiDelete(`/businesses/${businessId}/workers/${workerId}`);
                            await refetch();
                        } catch (err: any) {
                            console.error("Remove worker error:", err);
                            Alert.alert("שגיאה", "לא ניתן למחוק את העובד.");
                        } finally {
                            setDeletingWorkerId(null);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>ניהול צוות עובדים</Text>
            </View>
            <Text style={styles.cardSubtitle}>
                הוסף עובדים לעסק כדי שיוכלו לנהל יומן, לקבל תורים ולראות נתונים.
            </Text>

            {/* Workers List */}
            <View style={styles.listContainer}>
                {workers.length === 0 ? (
                    <Text style={styles.emptyText}>אין עובדים משויכים לעסק כרגע.</Text>
                ) : (
                    workers.map((worker) => (
                        <View key={worker._id} style={styles.workerRow}>

                            <View style={styles.workerInfo}>
                                {/* Avatar */}
                                {worker.avatarUrl ? (
                                    <Image
                                        source={{ uri: worker.avatarUrl }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarText}>
                                            {worker.name?.charAt(0) || "?"}
                                        </Text>
                                    </View>
                                )}

                                {/* Details */}
                                <View>
                                    <Text style={styles.workerName}>{worker.name}</Text>
                                    <Text style={styles.workerPhone}>{worker.phone}</Text>
                                </View>
                            </View>

                            {/* Delete Button */}
                            <TouchableOpacity
                                onPress={() => handleRemoveWorker(worker._id, worker.name)}
                                style={styles.deleteButton}
                                disabled={deletingWorkerId === worker._id}
                            >
                                {deletingWorkerId === worker._id ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                ) : (
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                )}
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>

            {/* Add Button */}
            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.actionButtonText}>הוספת עובד חדש +</Text>
            </TouchableOpacity>

            {/* Add Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>הוספת עובד</Text>
                        <Text style={styles.modalSubtitle}>
                            הזן את מספר הטלפון של המשתמש שברצונך להוסיף כעובד.
                            {"\n"}(המשתמש חייב להיות רשום לאפליקציה)
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="מספר טלפון (לדוגמה: 0501234567)"
                            value={newWorkerPhone}
                            onChangeText={setNewWorkerPhone}
                            keyboardType="phone-pad"
                            textAlign="right"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewWorkerPhone("");
                                }}
                            >
                                <Text style={styles.cancelButtonText}>ביטול</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: colorsSafe.primary },
                                ]}
                                onPress={handleAddWorker}
                                disabled={addingWorker}
                            >
                                {addingWorker ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.actionButtonText}>הוסף</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        gap: 12,
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        textAlign: "right",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "right",
    },
    listContainer: {
        marginTop: 8,
        gap: 12,
    },
    emptyText: {
        textAlign: "center",
        color: "#9ca3af",
        fontStyle: "italic",
        marginVertical: 10,
    },
    workerRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 10,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    workerInfo: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#e5e7eb",
    },
    avatarPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#6b7280",
    },
    workerName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        textAlign: "right",
    },
    workerPhone: {
        fontSize: 12,
        color: "#6b7280",
        textAlign: "right",
    },
    deleteButton: {
        padding: 8,
        backgroundColor: "#fee2e2",
        borderRadius: 8,
    },
    actionButton: {
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        maxWidth: 340,
        gap: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },
    modalSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: "#f9fafb",
        textAlign: "right",
    },
    modalButtons: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#f3f4f6",
    },
    cancelButtonText: {
        color: "#374151",
        fontWeight: "600",
    },
});
// app/adminAppointments/AdminAppointmentsScreen.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CalendarList } from "react-native-calendars";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL, apiFetch } from "@/services/api";

// ---- טיפוסים ----

type AppointmentStatus = "confirmed" | "canceled" | "completed" | "no_show";

interface AppointmentService {
    name: string;
    duration: number;
    price: number;
}

interface BusinessUserRef {
    _id: string;
    name?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
}

interface ClientRef {
    _id: string;
    name?: string;
    phone?: string;
}

interface Appointment {
    _id: string;
    business: string;
    client: ClientRef | string;
    worker: string;
    service: AppointmentService;
    start: string;
    status: AppointmentStatus;
    notes?: string | null;
    createdAt?: string;
}

interface CalendarDay {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
}

interface BusinessWithWorkers {
    _id: string;
    name: string;
    owner: BusinessUserRef;
    workers?: BusinessUserRef[];
}

interface Staff {
    id: string;
    name: string;
}

// ---- קבועים ----

const API_URL = `${URL}/appointments`;

// ---- פונקציות עזר ----

const dateToYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
};

// רק טווח שעות – בלי תאריך כי הוא מופיע למעלה במסך
const formatTimeRange = (iso: string, durationMin: number) => {
    const start = new Date(iso);
    const end = new Date(start.getTime() + durationMin * 60000);

    const startTime = start.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const endTime = end.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return `${startTime} - ${endTime}`;
};

const statusLabel = (status: AppointmentStatus): string => {
    switch (status) {
        case "confirmed":
            return "מאושר";
        case "completed":
            return "הושלם";
        case "canceled":
            return "בוטל";
        case "no_show":
            return "לא הגיע";
        default:
            return status;
    }
};

const statusColor = (status: AppointmentStatus): string => {
    switch (status) {
        case "confirmed":
            return "#22c55e";
        case "completed":
            return "#3b82f6";
        case "canceled":
            return "#ef4444";
        case "no_show":
            return "#f97316";
        default:
            return "#6b7280";
    }
};

// ---- קומפוננטת מסך ----

const Torim: React.FC = () => {
    const { user, userToken, isAdmin } = useAuth();
    const { businessData } = useBusinessDataContext();

    const business = businessData as BusinessWithWorkers | null;

    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [showStaffModal, setShowStaffModal] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDateModal, setShowDateModal] = useState(false);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // ---- בניית רשימת עובדים מה-businessData ----

    const staffOptions: Staff[] = useMemo(() => {
        if (!business) return [];

        const rawWorkers = business.workers || [];
        const owner = business.owner;

        if (rawWorkers.length > 0) {
            return rawWorkers.map((w) => ({
                id: w._id,
                name: w.name || w.fullName || w.phone || "איש צוות",
            }));
        }

        if (owner && owner._id) {
            return [
                {
                    id: owner._id,
                    name: owner.name || owner.fullName || business.name || "איש צוות",
                },
            ];
        }

        if (user?._id) {
            return [
                {
                    id: user._id,
                    name:
                        (user as any).fullName ||
                        (user as any).name ||
                        (user as any).email ||
                        "איש צוות",
                },
            ];
        }

        return [];
    }, [business, user]);

    // אם יש רק עובד אחד – לבחור אותו אוטומטית
    useEffect(() => {
        if (!selectedStaff && staffOptions.length === 1) {
            setSelectedStaff(staffOptions[0]);
        }
    }, [staffOptions, selectedStaff]);

    // ---- הבאת תורים של העובד ביום שנבחר ----

    const fetchAppointments = async () => {
        if (!userToken) return;
        if (!selectedStaff) return;

        const dateStr = dateToYMD(selectedDate);

        setLoading(true);
        try {
            const res = await apiFetch(
                `${API_URL}/by-day?date=${encodeURIComponent(
                    dateStr
                )}&worker=${encodeURIComponent(selectedStaff.id)}`,
                {
                    method: "GET",
                }
            );

            if (!res.ok) {
                console.log("❌ Failed GET /appointments/by-day");
                const txt = await res.text();
                console.log(txt);
                setAppointments([]);
                return;
            }

            const data: Appointment[] = await res.json();
            console.log("ADMIN by-day sample appt:", JSON.stringify(data[0], null, 2));
            setAppointments(data || []);
        } catch (err) {
            console.error("❌ Error fetching appointments (admin):", err);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    // להפעיל הבאה כל פעם שעובד או תאריך משתנים
    useEffect(() => {
        fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userToken, selectedStaff, selectedDate]);

    // ---- שינוי סטטוס ----

    const updateStatus = async (apptId: string, status: AppointmentStatus) => {
        setUpdatingId(apptId + ":" + status);

        try {
            const res = await apiFetch(`${API_URL}/${apptId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) {
                const txt = await res.text();
                console.log("❌ PATCH /appointments/:id/status:", res.status, txt);

                let msg = "לא ניתן לעדכן את הסטטוס.";
                try {
                    const json = JSON.parse(txt);
                    if (json.error === "SLOT_TAKEN") {
                        msg = "התרחש קונפליקט בשעת התור (SLOT_TAKEN).";
                    } else if (json.error) {
                        msg = json.error;
                    }
                } catch {
                    if (txt) msg = txt;
                }

                Alert.alert("שגיאה", msg);
                return;
            }

            const updated: Appointment = await res.json();

            setAppointments((prev) =>
                prev.map((a) => (a._id === updated._id ? updated : a))
            );
        } catch (err) {
            console.error("❌ Error updating status:", err);
            Alert.alert("שגיאה", "תקלה בעדכון הסטטוס.");
        } finally {
            setUpdatingId(null);
        }
    };

    const confirmStatusChange = (appt: Appointment, status: AppointmentStatus) => {
        Alert.alert(
            "שינוי סטטוס",
            `להגדיר את התור ל"${statusLabel(status)}"?`,
            [
                { text: "בטל", style: "cancel" },
                {
                    text: "אישור",
                    style: "destructive",
                    onPress: () => updateStatus(appt._id, status),
                },
            ]
        );
    };

    // ---- Render ----

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>ניהול תורים</Text>
                <Text style={styles.infoText}>רק אדמין יכול לראות את המסך הזה.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ניהול תורים</Text>

            {/* בחירת עובד – קודם שם, אחר כך "עובד" */}
            <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => {
                    if (staffOptions.length > 0) setShowStaffModal(true);
                }}
                disabled={staffOptions.length === 0}
            >
                <Text style={styles.selectorValue}>
                    {selectedStaff
                        ? selectedStaff.name
                        : staffOptions.length > 0
                            ? staffOptions[0].name
                            : "לא הוגדרו עובדים לעסק"}
                </Text>
                <Text style={styles.selectorLabel}>עובד</Text>
            </TouchableOpacity>

            {/* בחירת יום – קודם התאריך, אחר כך "תאריך" */}
            <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setShowDateModal(true)}
            >
                <Text style={styles.selectorValue}>
                    {selectedDate.toLocaleDateString("he-IL", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    })}
                </Text>
                <Text style={styles.selectorLabel}>תאריך</Text>
            </TouchableOpacity>

            {/* רשימת תורים */}
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 30 }} />
            ) : appointments.length === 0 ? (
                <Text style={styles.emptyText}>אין תורים ליום הזה עבור העובד שנבחר.</Text>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {appointments.map((appt) => {
                        const rawClient: any = appt.client;

                        const clientName =
                            rawClient &&
                                typeof rawClient === "object" &&
                                (rawClient.name?.trim() || rawClient.phone)
                                ? (rawClient.name?.trim() || rawClient.phone)
                                : "לקוח ללא שם";

                        const clientPhone =
                            rawClient &&
                                typeof rawClient === "object" &&
                                rawClient.phone
                                ? rawClient.phone
                                : undefined;

                        return (
                            <View key={appt._id} style={styles.card}>
                                {/* כותרת הכרטיסייה – שעה (ימין) + שירות (שמאל) */}
                                <View style={styles.cardHeaderRow}>
                                    <Text style={styles.cardTime}>
                                        {formatTimeRange(
                                            appt.start,
                                            appt.service.duration
                                        )}
                                    </Text>
                                    <Text style={styles.cardTitle}>{appt.service.name}</Text>
                                </View>

                                {/* שם הלקוח */}
                                <Text style={styles.cardClient}>
                                    <Text style={styles.cardLabel}>לקוח: </Text>
                                    {clientName}
                                </Text>

                                {/* טלפון הלקוח (רק אם קיים) */}
                                {clientPhone && (
                                    <Text style={styles.cardClient}>
                                        <Text style={styles.cardLabel}>טלפון: </Text>
                                        {clientPhone}
                                    </Text>
                                )}

                                {/* שורה תחתונה – כפתורים (שמאל) + סטטוס (ימין) */}
                                <View style={styles.statusRow}>
                                    <View style={styles.statusButtonsRow}>
                                        {(["completed", "no_show"] as AppointmentStatus[]).map(
                                            (status) => {
                                                const isCurrent = appt.status === status;
                                                const key = appt._id + ":" + status;
                                                const isLoading = updatingId === key;

                                                return (
                                                    <TouchableOpacity
                                                        key={status}
                                                        style={[
                                                            styles.statusButton,
                                                            isCurrent &&
                                                            styles.statusButtonActive,
                                                        ]}
                                                        onPress={() =>
                                                            !isCurrent &&
                                                            !isLoading &&
                                                            confirmStatusChange(
                                                                appt,
                                                                status
                                                            )
                                                        }
                                                        disabled={isCurrent || isLoading}
                                                    >
                                                        {isLoading ? (
                                                            <ActivityIndicator size="small" />
                                                        ) : (
                                                            <Text
                                                                style={[
                                                                    styles.statusButtonText,
                                                                    isCurrent &&
                                                                    styles
                                                                        .statusButtonTextActive,
                                                                ]}
                                                            >
                                                                {statusLabel(status)}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            }
                                        )}
                                    </View>

                                    <View
                                        style={[
                                            styles.statusPill,
                                            {
                                                backgroundColor:
                                                    statusColor(appt.status) + "20",
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusPillText,
                                                { color: statusColor(appt.status) },
                                            ]}
                                        >
                                            {statusLabel(appt.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* ---- מודל בחירת עובד ---- */}
            <Modal visible={showStaffModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>בחירת עובד</Text>
                            <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {staffOptions.length === 0 ? (
                            <Text style={styles.emptyText}>אין עובדים מוגדרים לעסק.</Text>
                        ) : (
                            staffOptions.map((staff) => (
                                <TouchableOpacity
                                    key={staff.id}
                                    style={styles.chip}
                                    onPress={() => {
                                        setSelectedStaff(staff);
                                        setShowStaffModal(false);
                                    }}
                                >
                                    <Text style={styles.chipText}>{staff.name}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </Modal>

            {/* ---- מודל בחירת יום (CalendarList) ---- */}
            <Modal visible={showDateModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { height: "80%" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>בחירת יום</Text>
                            <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <CalendarList
                            onDayPress={(day: CalendarDay) => {
                                const d = new Date(day.dateString);
                                setSelectedDate(d);
                                setShowDateModal(false);
                            }}
                            minDate={dateToYMD(new Date(2024, 0, 1))}
                            pastScrollRange={12}
                            futureScrollRange={12}
                            scrollEnabled
                            showScrollIndicator
                            theme={{
                                todayTextColor: "#1d4ed8",
                                selectedDayBackgroundColor: "#1d4ed8",
                            }}
                            markedDates={
                                {
                                    [dateToYMD(selectedDate)]: {
                                        selected: true,
                                        selectedColor: "#1d4ed8",
                                    },
                                } as any
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Torim;

// ---- Styles ----

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f3f4f6",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: "#4b5563",
        textAlign: "center",
    },

    selectorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    selectorLabel: {
        fontSize: 14,
        color: "#6b7280",
    },
    selectorValue: {
        fontSize: 16,
        fontWeight: "600",
    },

    emptyText: {
        textAlign: "center",
        color: "#6b7280",
        marginTop: 24,
        fontSize: 15,
    },

    card: {
        backgroundColor: "#ffffff",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        borderColor: "black",
        borderWidth: 1,
    },

    // כותרת הכרטיסייה – שעה (ימין) + שירות (שמאל)
    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        borderBottomColor: "black",
        borderBottomWidth: 1,
        paddingBottom: 4
    },

    // שירות (שמאל)
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "left",
        flexShrink: 1,
        marginLeft: 8,
    },

    // שעה – ימין
    cardTime: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "right",
    },

    // לייבל קטן לפני ערך (לקוח / טלפון)
    cardLabel: {
        fontWeight: "700",
    },

    // שורה ללקוח / טלפון
    cardClient: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 2,
        textAlign: "right",
    },

    // שורה תחתונה – כפתורים (שמאל) + סטטוס (ימין)
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },

    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: "700",
    },

    statusButtonsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    } as any,
    statusButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 8,
        backgroundColor: "#f9fafb",
    },
    statusButtonActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    statusButtonText: {
        fontSize: 13,
        color: "#111827",
        fontWeight: "600",
    },
    statusButtonTextActive: {
        color: "#ffffff",
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.2)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
        minHeight: "45%",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    closeText: {
        fontSize: 18,
    },
    chip: {
        borderRadius: 999,
        backgroundColor: "#f9fafb",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 10,
        alignItems: "flex-end",
    },
    chipText: {
        fontSize: 15,
    },
});

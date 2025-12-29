// app/admin/torim.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

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
    client: ClientRef | string; // יכול להיות אובייקט או ID
    worker: string;
    service: AppointmentService;
    start: string;
    status: AppointmentStatus;
    notes?: string | null;
    createdAt?: string;
}

interface Staff {
    id: string;
    name: string;
}

interface AdminStats {
    todayCount: number;
    futureCount: number;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const dateToYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

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

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
    confirmed: { label: "מאושר", color: "#22c55e" },
    completed: { label: "הושלם", color: "#3b82f6" },
    canceled: { label: "בוטל", color: "#ef4444" },
    no_show: { label: "לא הגיע", color: "#f97316" },
};

const getRelativeDayLabel = (date: Date): string => {
    const startOfDay = (d: Date) => {
        const c = new Date(d);
        c.setHours(0, 0, 0, 0);
        return c;
    };

    const today = startOfDay(new Date());
    const target = startOfDay(date);

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "מחר";
    if (diffDays === -1) return "אתמול";

    return date.toLocaleDateString("he-IL", { weekday: "long", day: "2-digit", month: "2-digit" });
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

const TorimScreen: React.FC = () => {
    const { user, userToken, isAdmin } = useAuth();
    const { businessData } = useBusinessDataContext();

    const business = businessData as any; // Cast for flexibility

    // State
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [showStaffModal, setShowStaffModal] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDateModal, setShowDateModal] = useState(false);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const relativeDayLabel = useMemo(() => getRelativeDayLabel(selectedDate), [selectedDate]);

    // --- Staff Logic ---

    const staffOptions: Staff[] = useMemo(() => {
        if (!business) return [];

        if (business.workers?.length > 0) {
            return business.workers.map((w: any) => ({
                id: w._id,
                name: w.name || w.fullName || "איש צוות",
            }));
        }

        if (business.owner?._id) {
            return [{
                id: business.owner._id,
                name: business.owner.name || "בעלים",
            }];
        }

        // Fallback: המשתמש המחובר עצמו
        if (user?._id) {
            return [{ id: user._id, name: "אני" }];
        }

        return [];
    }, [business, user]);

    useEffect(() => {
        if (!selectedStaff && staffOptions.length === 1) {
            setSelectedStaff(staffOptions[0]);
        }
    }, [staffOptions, selectedStaff]);

    // --- Data Fetching ---

    const fetchAppointments = useCallback(async () => {
        if (!userToken || !selectedStaff) return;

        setLoading(true);
        try {
            const dateStr = dateToYMD(selectedDate);
            const res = await apiFetch(
                `/appointments/by-day?date=${dateStr}&worker=${selectedStaff.id}`
            );

            if (res.ok) {
                const data = await res.json();
                // מיון לפי שעה
                const sorted = (data || []).sort((a: Appointment, b: Appointment) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime()
                );
                setAppointments(sorted);
            } else {
                setAppointments([]);
            }
        } catch (err) {
            console.error("Error fetching admin appointments:", err);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [userToken, selectedStaff, selectedDate]);

    const fetchStats = useCallback(async () => {
        if (!userToken) return;

        setStatsLoading(true);
        try {
            let url = "/appointments/admin-stats";
            if (selectedStaff?.id) {
                url += `?worker=${selectedStaff.id}`;
            }

            const res = await apiFetch(url);
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setStatsLoading(false);
        }
    }, [userToken, selectedStaff]);

    // טעינה מחדש בשינוי פרמטרים
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- Status Updates ---

    const updateStatus = async (apptId: string, status: AppointmentStatus) => {
        setUpdatingId(apptId);
        try {
            const res = await apiFetch(`/appointments/${apptId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                const msg = json.error === "SLOT_TAKEN"
                    ? "השעה תפוסה (קונפליקט)."
                    : (json.error || "שגיאה בעדכון");
                Alert.alert("שגיאה", msg);
                return;
            }

            const updatedAppt = await res.json();
            setAppointments(prev => prev.map(a => a._id === updatedAppt._id ? updatedAppt : a));

        } catch (err) {
            Alert.alert("שגיאה", "תקלה בתקשורת.");
        } finally {
            setUpdatingId(null);
        }
    };

    const confirmStatusChange = (appt: Appointment, status: AppointmentStatus) => {
        const label = STATUS_CONFIG[status].label;
        Alert.alert(
            "שינוי סטטוס",
            `לשנות את הסטטוס ל"${label}"?`,
            [
                { text: "בטל", style: "cancel" },
                {
                    text: "אישור",
                    style: "destructive",
                    onPress: () => updateStatus(appt._id, status)
                },
            ]
        );
    };

    // --- Render Helpers ---

    const getClientName = (client: ClientRef | string) => {
        if (typeof client === 'object' && client?.name) return client.name;
        if (typeof client === 'object' && client?.phone) return client.phone;
        return "לקוח ללא שם";
    };

    const getClientPhone = (client: ClientRef | string) => {
        if (typeof client === 'object' && client?.phone) return client.phone;
        return null;
    };

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text>אין לך הרשאות צפייה במסך זה.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ניהול תורים</Text>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>תורים היום</Text>
                    {statsLoading ? <ActivityIndicator size="small" /> : <Text style={styles.statValue}>{stats?.todayCount || 0}</Text>}
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>עתידיים</Text>
                    {statsLoading ? <ActivityIndicator size="small" /> : <Text style={styles.statValue}>{stats?.futureCount || 0}</Text>}
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <TouchableOpacity style={styles.filterBtn} onPress={() => staffOptions.length > 0 && setShowStaffModal(true)}>
                    <Text style={styles.filterLabel}>עובד</Text>
                    <Text style={styles.filterValue}>{selectedStaff?.name || "בחר..."}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowDateModal(true)}>
                    <Text style={styles.filterLabel}>תאריך</Text>
                    <Text style={styles.filterValue}>
                        {selectedDate.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Day Title */}
            <Text style={styles.dayLabel}>{relativeDayLabel}</Text>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#000" />
            ) : appointments.length === 0 ? (
                <Text style={styles.emptyText}>אין תורים ליום זה.</Text>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {appointments.map((appt) => {
                        const statusConf = STATUS_CONFIG[appt.status];
                        const clientName = getClientName(appt.client);
                        const clientPhone = getClientPhone(appt.client);

                        return (
                            <View key={appt._id} style={styles.card}>

                                {/* Header: Time & Service */}
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTime}>
                                        {formatTimeRange(appt.start, appt.service.duration)}
                                    </Text>
                                    <Text style={styles.cardTitle}>{appt.service.name}</Text>
                                </View>

                                {/* Client Info */}
                                <Text style={styles.cardClient}>👤 {clientName}</Text>
                                {clientPhone && <Text style={styles.cardClient}>📞 {clientPhone}</Text>}

                                {/* Actions */}
                                <View style={styles.actionsRow}>
                                    {/* Status Actions */}
                                    <View style={styles.buttonsContainer}>
                                        {(['completed', 'no_show'] as AppointmentStatus[]).map(s => {
                                            const isSelected = appt.status === s;
                                            return (
                                                <TouchableOpacity
                                                    key={s}
                                                    style={[styles.actionBtn, isSelected && styles.actionBtnActive]}
                                                    onPress={() => !isSelected && confirmStatusChange(appt, s)}
                                                    disabled={isSelected || updatingId === appt._id}
                                                >
                                                    <Text style={[styles.actionBtnText, isSelected && { color: '#fff' }]}>
                                                        {STATUS_CONFIG[s].label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Current Status Badge */}
                                    <View style={[styles.statusBadge, { backgroundColor: statusConf.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: statusConf.color }]}>
                                            {statusConf.label}
                                        </Text>
                                    </View>
                                </View>

                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* --- Modals --- */}

            {/* Staff Modal */}
            <Modal visible={showStaffModal} transparent animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>בחירת עובד</Text>
                        {staffOptions.map(s => (
                            <TouchableOpacity key={s.id} style={styles.modalItem} onPress={() => {
                                setSelectedStaff(s);
                                setShowStaffModal(false);
                            }}>
                                <Text style={styles.modalItemText}>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Date Modal */}
            <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { height: '70%' }]}>
                        <CalendarList
                            current={dateToYMD(selectedDate)}
                            onDayPress={(day: any) => {
                                setSelectedDate(new Date(day.dateString));
                                setShowDateModal(false);
                            }}
                            pastScrollRange={12}
                            futureScrollRange={12}
                            theme={{
                                selectedDayBackgroundColor: '#111',
                                todayTextColor: '#111',
                            }}
                            markedDates={{
                                [dateToYMD(selectedDate)]: { selected: true, selectedColor: '#111' }
                            }}
                        />
                    </View>
                </View>
            </Modal>

        </View>
    );
};

export default TorimScreen;

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f3f4f6",
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
        color: "#111",
    },

    // Stats
    statsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        alignItems: "center",
        elevation: 2,
    },
    statLabel: { fontSize: 12, color: "#6b7280" },
    statValue: { fontSize: 20, fontWeight: "700", color: "#111" },

    // Filters
    filtersContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    filterBtn: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row-reverse', // Label right, value left
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 1,
    },
    filterLabel: { fontSize: 12, color: "#6b7280" },
    filterValue: { fontSize: 14, fontWeight: "600" },

    dayLabel: {
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: "#374151",
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: "#9ca3af",
    },

    // Appointment Card
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        paddingBottom: 8,
    },
    cardTime: { fontSize: 16, fontWeight: "700" },
    cardTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },

    cardClient: {
        textAlign: 'right',
        fontSize: 14,
        color: "#4b5563",
        marginBottom: 4,
    },

    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    actionBtnActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
    },

    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalTitle: {
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    modalItemText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
// app/(user)/torList.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiFetch } from "@/services/api";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface BusinessRefFromAppt {
    _id: string;
    name?: string;
    address?: string;
    phone?: string;
}

interface Appointment {
    _id: string;
    start: string;
    service: {
        name: string;
        duration: number;
        price: number;
    };
    worker?: {
        _id: string;
        name?: string;
        fullName?: string;
    };
    business: BusinessRefFromAppt;
    status: "confirmed" | "completed" | "canceled" | "no_show";
}

const HOURS_24_MS = 24 * 60 * 60 * 1000;

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const formatApptRange = (iso: string, durationMin: number) => {
    const start = new Date(iso);
    const end = new Date(start.getTime() + durationMin * 60000);

    const datePart = start.toLocaleDateString("he-IL", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    });

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

    return `${datePart}  |  ${startTime} - ${endTime}`;
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function TorList() {
    const { userToken } = useAuth();
    const { businessData } = useBusinessDataContext();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    // נתונים מה-Context (עם Fallback במידת הצורך)
    const business: any = businessData || {};

    /**
     * טעינת תורים מהשרת
     */
    const fetchAppointments = useCallback(async () => {
        try {
            const res = await apiFetch("/appointments/my?statuses=confirmed,completed&includePast=false");

            if (!res.ok) {
                setAppointments([]);
                return;
            }

            const data = await res.json();
            // מיון: תאריך קרוב קודם
            const sorted = (data || []).sort((a: Appointment, b: Appointment) =>
                new Date(a.start).getTime() - new Date(b.start).getTime()
            );

            setAppointments(sorted);
        } catch (err) {
            console.error("Error fetching appointments:", err);
        }
    }, []);

    // טעינה ראשונית
    useEffect(() => {
        if (!userToken) return;

        setLoading(true);
        fetchAppointments().finally(() => setLoading(false));
    }, [userToken, fetchAppointments]);

    // רענון ידני (Pull to Refresh)
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAppointments();
        setRefreshing(false);
    };

    /**
     * ביטול תור
     */
    const handleCancel = async (id: string) => {
        setCancelingId(id);
        try {
            const res = await apiFetch(`/appointments/${id}/cancel`, {
                method: "PATCH",
            });

            if (res.ok) {
                setAppointments((prev) => prev.filter((a) => a._id !== id));
                Alert.alert("התור בוטל", "התור בוטל בהצלחה.");
                return;
            }

            // פענוח שגיאה מהשרת
            const json = await res.json().catch(() => ({}));
            let msg = "לא ניתן לבטל את התור.";

            if (json.error === "CANNOT_CANCEL_WITHIN_24H") {
                msg = "לא ניתן לבטל תור שפחות מ־24 שעות למועדו.";
            } else if (json.error === "ONLY_CONFIRMED_CAN_BE_CANCELED") {
                msg = "ניתן לבטל רק תורים במצב מאושר.";
            } else if (json.message || json.error) {
                msg = json.message || json.error;
            }

            Alert.alert("שגיאה בביטול", msg);
        } catch (err) {
            Alert.alert("שגיאה", "תקלה בתקשורת עם השרת.");
        } finally {
            setCancelingId(null);
        }
    };

    const confirmCancel = (id: string) => {
        Alert.alert(
            "ביטול תור",
            "האם אתה בטוח שברצונך לבטל את התור?",
            [
                { text: "לא", style: "cancel" },
                {
                    text: "כן, בטל תור",
                    style: "destructive",
                    onPress: () => handleCancel(id)
                },
            ]
        );
    };

    // --- Derived Business Info ---

    // שימוש במידע מה-Context אם קיים, אחרת מנסים לקחת מהתור הראשון (למקרה של אפליקציה מרובת עסקים בעתיד)
    const displayBusinessName = business.name || appointments[0]?.business?.name || "העסק";
    const displayAddress = business.address || appointments[0]?.business?.address;
    const displayPhone = business.phone || appointments[0]?.business?.phone;

    const openWaze = () => {
        if (!displayAddress) {
            Alert.alert("שגיאה", "לא קיימת כתובת לעסק זה.");
            return;
        }
        const encoded = encodeURIComponent(displayAddress);
        Linking.openURL(`https://waze.com/ul?q=${encoded}&navigate=yes`)
            .catch(() => Alert.alert("שגיאה", "לא ניתן לפתוח את Waze"));
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>התורים שלך</Text>

            <Text style={styles.infoText}>
                ניתן לבטל תור עד <Text style={{ fontWeight: "700" }}>24 שעות</Text> לפני מועד התור.
            </Text>

            {/* Business Info Card */}
            <View style={styles.businessCard}>
                <Text style={styles.businessName}>{displayBusinessName}</Text>

                <Text style={styles.businessAddress}>
                    {displayAddress ? `כתובת: ${displayAddress}` : "כתובת לא צוינה"}
                </Text>

                {displayPhone && (
                    <Text style={styles.businessPhone}>טלפון: {displayPhone}</Text>
                )}

                {displayAddress && (
                    <TouchableOpacity style={styles.wazeButton} onPress={openWaze}>
                        <Text style={styles.wazeButtonText}>נווט עם Waze 🚗</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Appointment List */}
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 30 }} color="#000" />
            ) : appointments.length === 0 ? (
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <Text style={styles.emptyText}>אין לך תורים עתידיים כרגע 🙂</Text>
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {appointments.map((appt) => {
                        const startDate = new Date(appt.start);
                        const diffMs = startDate.getTime() - Date.now();
                        // האם ניתן לבטל? (סטטוס מאושר + יותר מ-24 שעות)
                        const canCancel = appt.status === "confirmed" && diffMs > HOURS_24_MS;

                        const workerName = appt.worker?.name || appt.worker?.fullName || "איש צוות";

                        return (
                            <View key={appt._id} style={styles.card}>

                                {/* Header: Status + Cancel Button */}
                                <View style={styles.cardHeaderRow}>
                                    <View>
                                        {canCancel ? (
                                            <TouchableOpacity
                                                style={styles.cancelButton}
                                                onPress={() => confirmCancel(appt._id)}
                                                disabled={cancelingId === appt._id}
                                            >
                                                {cancelingId === appt._id ? (
                                                    <ActivityIndicator size="small" color="#b91c1c" />
                                                ) : (
                                                    <Text style={styles.cancelButtonText}>בטל תור</Text>
                                                )}
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={{ width: 10 }} /> // Spacer if no button
                                        )}
                                    </View>

                                    <Text style={[
                                        styles.cardStatus,
                                        appt.status === "confirmed" && { color: "green", fontWeight: "600" }
                                    ]}>
                                        {appt.status === "confirmed" ? "מאושר ✅" :
                                            appt.status === "completed" ? "הושלם" : appt.status}
                                    </Text>
                                </View>

                                {/* Body: Details */}
                                <Text style={styles.cardTitle}>{appt.service.name}</Text>
                                <Text style={styles.cardSub}>
                                    {formatApptRange(appt.start, appt.service.duration)}
                                </Text>

                                {appt.worker && (
                                    <Text style={styles.cardWorker}>
                                        מטפל: {workerName}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f3f4f6",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
        color: "#111",
    },
    infoText: {
        fontSize: 13,
        color: "#4b5563",
        textAlign: "center",
        marginBottom: 16,
    },

    // Business Card
    businessCard: {
        backgroundColor: "#ffffff",
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        alignItems: "center", // Center content for cleaner look
    },
    businessName: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
        color: "#111",
    },
    businessAddress: {
        fontSize: 14,
        color: "#4b5563",
        marginBottom: 4,
    },
    businessPhone: {
        fontSize: 14,
        color: "#4b5563",
        marginBottom: 12,
    },
    wazeButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: "#3b82f6", // Waze blue-ish
        borderRadius: 20,
    },
    wazeButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },

    // List
    emptyText: {
        textAlign: "center",
        color: "#6b7280",
        marginTop: 50,
        fontSize: 16,
    },
    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    cardStatus: {
        fontSize: 14,
        color: "#6b7280",
    },
    cancelButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#fee2e2",
    },
    cancelButtonText: {
        color: "#b91c1c",
        fontWeight: "600",
        fontSize: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
        textAlign: "right",
        color: "#111",
    },
    cardSub: {
        fontSize: 15,
        color: "#374151",
        marginBottom: 8,
        textAlign: "right",
    },
    cardWorker: {
        fontSize: 14,
        color: "#2563eb",
        textAlign: "right",
        fontWeight: "500",
    },
});
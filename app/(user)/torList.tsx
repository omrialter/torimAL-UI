import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL, apiFetch } from "@/services/api";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
    status: string;
}

const HOURS_24_MS = 24 * 60 * 60 * 1000;

export default function TorList() {
    const { userToken } = useAuth();
    const { businessData } = useBusinessDataContext();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    const fetchAppointments = async () => {
        try {
            const res = await apiFetch(
                `${URL}/appointments/my?statuses=confirmed,completed&includePast=false`,
                { method: "GET" }
            );

            if (!res.ok) {
                console.log("❌ Failed GET /appointments/my");
                setAppointments([]);
                return;
            }

            const data = await res.json();
            setAppointments(data || []);
        } catch (err) {
            console.error("❌ Error fetching appointments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userToken) return;
        fetchAppointments();
    }, [userToken]);

    // --- מידע על העסק (שם + כתובת + טלפון) ---
    const businessName = useMemo(() => {
        return (businessData as any)?.name || appointments[0]?.business?.name || "העסק";
    }, [businessData, appointments]);

    const businessAddress = useMemo(() => {
        return (
            (businessData as any)?.address ||
            appointments[0]?.business?.address ||
            undefined
        );
    }, [businessData, appointments]);

    const businessPhone = useMemo(() => {
        return (
            (businessData as any)?.phone ||
            appointments[0]?.business?.phone ||
            undefined
        );
    }, [businessData, appointments]);

    const openWaze = () => {
        if (!businessAddress) {
            Alert.alert("שגיאה", "לא נמצאה כתובת לעסק");
            return;
        }
        const encoded = encodeURIComponent(businessAddress);
        const url = `https://waze.com/ul?q=${encoded}&navigate=yes`;
        Linking.openURL(url).catch(() =>
            Alert.alert("שגיאה", "שגיאה בפתיחת Waze")
        );
    };

    // תצוגת טווח שעות
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

        return `${datePart}   ${startTime}-${endTime}`;
    };

    const handleCancel = async (id: string) => {
        setCancelingId(id);
        try {
            const res = await apiFetch(`${URL}/appointments/${id}/cancel`, {
                method: "PATCH",
            });

            if (res.ok) {
                setAppointments((prev) => prev.filter((a) => a._id !== id));
                Alert.alert("התור בוטל", "התור בוטל בהצלחה.");
                return;
            }

            const txt = await res.text();
            let msg = "לא ניתן לבטל את התור.";

            try {
                const json = JSON.parse(txt);
                if (json.error === "CANNOT_CANCEL_WITHIN_24H") {
                    msg = "לא ניתן לבטל תור שפחות מ־24 שעות למועדו.";
                } else if (json.error === "ONLY_CONFIRMED_CAN_BE_CANCELED") {
                    msg = "ניתן לבטל רק תורים במצב מאושר.";
                } else if (json.error) {
                    msg = json.error;
                }
            } catch {
                if (txt) msg = txt;
            }

            Alert.alert("שגיאה", msg);
        } catch (err) {
            console.error("❌ Error canceling appointment:", err);
            Alert.alert("שגיאה", "תקלה בביטול התור, נסה שוב מאוחר יותר.");
        } finally {
            setCancelingId(null);
        }
    };

    const confirmCancel = (id: string) => {
        Alert.alert(
            "ביטול תור",
            "האם אתה בטוח שברצונך לבטל את התור?",
            [
                {
                    text: "לא",
                    style: "cancel",
                },
                {
                    text: "כן, בטל",
                    style: "destructive",
                    onPress: () => handleCancel(id),
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>התורים שלך</Text>

            <Text style={styles.infoText}>
                ניתן לבטל תור עד{" "}
                <Text style={{ fontWeight: "700" }}>24 שעות</Text> לפני מועד התור.
            </Text>

            {/* כרטיס העסק */}
            <View style={styles.businessCard}>
                <Text style={styles.businessName}>{businessName}</Text>

                <Text style={styles.businessAddress}>
                    {businessAddress ? `כתובת: ${businessAddress}` : "כתובת לא זמינה"}
                </Text>

                {businessPhone && (
                    <Text style={styles.businessPhone}>
                        טלפון: {businessPhone}
                    </Text>
                )}

                {businessAddress && (
                    <TouchableOpacity style={styles.wazeButton} onPress={openWaze}>
                        <Text style={styles.wazeButtonText}>פתח ניווט ב־Waze</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 30 }} />
            ) : appointments.length === 0 ? (
                <Text style={styles.emptyText}>אין לך תורים עתידיים כרגע 🙂</Text>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {appointments.map((appt) => {
                        const startDate = new Date(appt.start);
                        const diffMs = startDate.getTime() - Date.now();
                        const canCancel =
                            appt.status === "confirmed" && diffMs > HOURS_24_MS;

                        return (
                            <View key={appt._id} style={styles.card}>
                                {/* שורה עליונה בכרטיס: סטטוס + ביטול */}
                                <View style={styles.cardHeaderRow}>
                                    {canCancel && (
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => confirmCancel(appt._id)}
                                            disabled={cancelingId === appt._id}
                                        >
                                            {cancelingId === appt._id ? (
                                                <ActivityIndicator size="small" />
                                            ) : (
                                                <Text style={styles.cancelButtonText}>
                                                    בטל תור
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <Text style={styles.cardStatus}>
                                        סטטוס:{" "}
                                        {appt.status === "confirmed" ? "מאושר" : appt.status}
                                    </Text>
                                </View>

                                <Text style={styles.cardTitle}>{appt.service.name}</Text>

                                <Text style={styles.cardSub}>
                                    {formatApptRange(appt.start, appt.service.duration)}
                                </Text>

                                {appt.worker && (
                                    <Text style={styles.cardWorker}>
                                        אצל:{" "}
                                        {appt.worker.name ||
                                            appt.worker.fullName ||
                                            "איש צוות"}
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
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        color: "#4b5563",
        textAlign: "right",
        marginBottom: 12,
    },

    // --- עסק ---
    businessCard: {
        backgroundColor: "#ffffff",
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
        alignItems: "flex-end",
    },
    businessName: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
        textAlign: "right",
        width: "100%",
    },
    businessAddress: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 6,
        textAlign: "right",
        width: "100%",
    },
    businessPhone: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 10,
        textAlign: "right",
        width: "100%",
    },
    wazeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#2d7eff",
        borderRadius: 20,
        alignSelf: "flex-end",
    },
    wazeButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },

    // --- רשימת תורים ---
    emptyText: {
        textAlign: "center",
        color: "#6b7280",
        marginTop: 30,
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
        alignItems: "flex-end",
    },

    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 10,
    },
    cardStatus: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "right",
    },
    cancelButton: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fef2f2",
    },
    cancelButtonText: {
        color: "#b91c1c",
        fontWeight: "600",
        fontSize: 13,
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 6,
        textAlign: "right",
        width: "100%",
    },
    cardSub: {
        fontSize: 15,
        color: "#374151",
        marginVertical: 6,
        textAlign: "right",
        width: "100%",
        lineHeight: 22,
    },
    cardWorker: {
        fontSize: 14,
        color: "#1d4ed8",
        marginBottom: 4,
        textAlign: "right",
        width: "100%",
    },
});

// app/(user)/orderTor.tsx (BookAppointmentScreen)

import { useLocalSearchParams, useRouter } from "expo-router";
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
import { CalendarList, DateData } from "react-native-calendars";

// Contexts & Services
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiFetch } from "@/services/api";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------

type AppointmentStatus = "confirmed" | "canceled" | "completed" | "no_show";
const BLOCKING_STATUSES: AppointmentStatus[] = ["confirmed"];

interface OpeningHoursRange {
    open: string | null;
    close: string | null;
}

interface OpeningHoursByDay {
    [key: string]: OpeningHoursRange | undefined;
    sunday: OpeningHoursRange;
    monday: OpeningHoursRange;
    tuesday: OpeningHoursRange;
    wednesday: OpeningHoursRange;
    thursday: OpeningHoursRange;
    friday: OpeningHoursRange;
    saturday: OpeningHoursRange;
}

interface StaffMember {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface ServiceItem {
    id: string;
    name: string;
    duration: number;
    price: number;
}

interface Appointment {
    _id: string;
    start: string; // ISO String
    status: AppointmentStatus;
    service: { duration: number };
}

interface Block {
    _id: string;
    resource: string | null; // null = חסימה לכל העסק, string = חסימה לעובד ספציפי
    start: string;
    end: string;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const dateToYMD = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const minutesToMs = (min: number) => min * 60 * 1000;

const formatTime = (d: Date) =>
    d.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

const formatDate = (d: Date) =>
    d.toLocaleDateString("he-IL", { weekday: "long", day: "2-digit", month: "2-digit" });

const intervalsOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart;

// --- Opening Hours Logic ---

const DAY_KEYS = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
] as const;

const DAY_LABELS: Record<string, string> = {
    sunday: "ראשון",
    monday: "שני",
    tuesday: "שלישי",
    wednesday: "רביעי",
    thursday: "חמישי",
    friday: "שישי",
    saturday: "שבת",
};

const applyTimeToDate = (baseDate: Date, timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
};

const getOpeningRangeForDate = (
    date: Date,
    openingHours?: OpeningHoursByDay
): { dayStart: Date; dayEnd: Date } | null => {
    if (!openingHours) return null;

    const dayIndex = date.getDay();
    const key = DAY_KEYS[dayIndex];
    const range = openingHours[key];

    if (!range || !range.open || !range.close) return null;

    const dayStart = applyTimeToDate(date, range.open);
    const dayEnd = applyTimeToDate(date, range.close);

    if (dayEnd <= dayStart) return null;

    return { dayStart, dayEnd };
};

// ----------------------------------------------------------------------
// Sub-Component: DayCell
// ----------------------------------------------------------------------

interface DayCellProps {
    date?: DateData;
    state?: string;
    openingHours?: OpeningHoursByDay;
    blockedDatesMap: { [dateStr: string]: boolean };
    selectedDate: Date | null;
    onPickDate: (dateString: string) => void;
}

const DayCell = React.memo(({
    date,
    state,
    openingHours,
    blockedDatesMap,
    selectedDate,
    onPickDate,
}: DayCellProps) => {
    if (!date?.dateString) return <View />;

    const d = new Date(date.dateString);
    const opening = getOpeningRangeForDate(d, openingHours);
    const isBlockedDay = !!blockedDatesMap[date.dateString];

    // ימים מהעבר או ימים שהם לא בחודש הנוכחי (תלוי ב-Calendar implementation)
    const isPast = state === "disabled";
    const isClosed = !opening || isBlockedDay || isPast;

    const isSelected = !!selectedDate && date.dateString === dateToYMD(selectedDate);
    const isToday = state === "today";

    const handlePress = () => {
        if (isClosed) {
            if (!isPast) {
                Alert.alert(
                    isBlockedDay ? "יום חסום" : "העסק סגור",
                    isBlockedDay ? "ביום זה קיימת חסימה (חופשה/חג)." : "העסק אינו פעיל ביום זה."
                );
            }
            return;
        }
        onPickDate(date.dateString);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={isClosed ? 1 : 0.6}
        >
            <View
                style={[
                    styles.dayContainer,
                    isBlockedDay && styles.dayContainerBlocked,
                    isSelected && styles.dayContainerSelected,
                    isPast && { opacity: 0.3 },
                ]}
            >
                <Text
                    style={[
                        styles.dayText,
                        isClosed && styles.dayTextClosed,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                    ]}
                >
                    {date.day}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

// ----------------------------------------------------------------------
// Main Component: BookAppointmentScreen
// ----------------------------------------------------------------------

export default function BookAppointmentScreen() {
    const router = useRouter();

    // Context Data
    const { user, userToken } = useAuth();
    const { businessData } = useBusinessDataContext();

    // Params (QuickBook)
    const params = useLocalSearchParams();
    const { preSelectedDate, workerId: paramWorkerId, serviceId: paramServiceId } = params;

    // Local State
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);

    // Data State
    const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
    const [dayBlocks, setDayBlocks] = useState<Block[]>([]);
    const [blockedDatesMap, setBlockedDatesMap] = useState<{ [dateStr: string]: boolean }>({});

    // Loading & Modals
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Business Data Parsing
    // שימוש ב-any כאן רק לצורך חילוץ מהיר, כי המבנה המלא של businessData מורכב
    const business = businessData as any;
    const openingHours = business?.openingHours as OpeningHoursByDay | undefined;

    const clientId = user?._id;

    // --- Derived Data: Staff & Services ---

    const services: ServiceItem[] = useMemo(() => {
        return business?.services?.map((s: any) => ({
            id: s._id,
            name: s.name,
            duration: s.duration,
            price: s.price,
        })) || [];
    }, [business]);

    const staffOptions: StaffMember[] = useMemo(() => {
        if (business?.workers?.length) {
            return business.workers.map((w: any) => ({
                id: w._id,
                name: w.name || w.fullName || "עובד",
                avatarUrl: w.avatarUrl,
            }));
        }
        // Fallback: בעל העסק
        return [{
            id: business?.owner?._id,
            name: business?.owner?.name || "איש צוות",
        }];
    }, [business]);

    // קביעת עובד ברירת מחדל אם יש רק אחד
    useEffect(() => {
        if (!selectedStaff && staffOptions.length === 1) {
            setSelectedStaff(staffOptions[0]);
        }
    }, [staffOptions, selectedStaff]);

    const selectedWorkerId = selectedStaff?.id || staffOptions[0]?.id;

    // --- QuickBook Logic (Deep Linking) ---
    useEffect(() => {
        if (!preSelectedDate && !paramWorkerId && !paramServiceId) return;

        // מניעת דריסה אם המשתמש כבר בחר
        if (selectedDate && selectedStaff && selectedService) return;

        if (paramWorkerId) {
            const w = staffOptions.find(s => s.id === paramWorkerId);
            if (w) setSelectedStaff(w);
        }

        if (paramServiceId) {
            const s = services.find(srv => srv.id === paramServiceId);
            if (s) setSelectedService(s);
        }

        if (typeof preSelectedDate === 'string') {
            const d = new Date(preSelectedDate);
            if (!isNaN(d.getTime())) {
                setSelectedDate(d);
                setSelectedTime(d);
            }
        }
    }, [preSelectedDate, paramWorkerId, paramServiceId, staffOptions, services]);


    // --- Data Fetching: Slots & Blocks ---

    // 1. טעינת תורים ובלוקים ליום ספציפי (בעת בחירת תאריך)
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedDate || !userToken || !selectedWorkerId) return;

            setLoadingSlots(true);
            const dateStr = dateToYMD(selectedDate);

            try {
                // שימוש ב-Promise.all לביצוע בקשות במקביל
                const [apptsRes, blocksRes] = await Promise.all([
                    apiFetch(`/appointments/by-day?date=${dateStr}&worker=${selectedWorkerId}`),
                    apiFetch(`/blocks/by-day?date=${dateStr}&worker=${selectedWorkerId}`)
                ]);

                if (apptsRes.ok) setDayAppointments(await apptsRes.json());
                if (blocksRes.ok) setDayBlocks(await blocksRes.json());

            } catch (err) {
                console.log("Error loading slots:", err);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchData();
    }, [selectedDate, selectedWorkerId, userToken]);


    // 2. טעינת חסימות לחצי שנה קדימה (לצביעת היומן)
    useEffect(() => {
        const fetchRangeBlocks = async () => {
            if (!userToken || !selectedWorkerId) {
                setBlockedDatesMap({});
                return;
            }

            try {
                const fromDate = new Date();
                const toDate = new Date();
                toDate.setMonth(toDate.getMonth() + 6);

                const res = await apiFetch(
                    `/blocks/list?from=${dateToYMD(fromDate)}&to=${dateToYMD(toDate)}&resource=${selectedWorkerId}`
                );

                if (!res.ok) return;

                const blocks: Block[] = await res.json();
                const map: { [key: string]: boolean } = {};

                blocks.forEach((block) => {
                    // סינון בלוקים רלוונטיים (כלליים או של העובד)
                    if (block.resource && block.resource !== selectedWorkerId) return;

                    const blockStart = new Date(block.start);
                    const blockEnd = new Date(block.end);

                    let cursor = new Date(blockStart);
                    cursor.setHours(0, 0, 0, 0);

                    const endDay = new Date(blockEnd);
                    endDay.setHours(0, 0, 0, 0);

                    // מעבר על כל הימים בטווח החסימה
                    while (cursor <= endDay) {
                        const range = getOpeningRangeForDate(cursor, openingHours);

                        // אם החסימה מכסה את כל שעות הפעילות של אותו יום
                        if (range) {
                            const { dayStart, dayEnd } = range;
                            if (blockStart <= dayStart && blockEnd >= dayEnd) {
                                map[dateToYMD(cursor)] = true;
                            }
                        }
                        cursor.setDate(cursor.getDate() + 1);
                    }
                });

                setBlockedDatesMap(map);

            } catch (err) {
                console.error("fetchRangeBlocks error", err);
            }
        };

        fetchRangeBlocks();
    }, [selectedWorkerId, userToken, openingHours]);


    // --- Logic: Calculate Available Slots ---

    const availableSlots = useMemo(() => {
        if (!selectedDate || !selectedService || !openingHours) return [];

        const range = getOpeningRangeForDate(selectedDate, openingHours);
        if (!range) return []; // יום סגור

        const { dayStart, dayEnd } = range;
        const duration = selectedService.duration;

        const slots: Date[] = [];
        let cursor = new Date(dayStart);

        // בדיקה אם היום הוא "היום" כדי לסנן שעות שעברו
        const now = new Date();
        const isToday = selectedDate.getDate() === now.getDate() &&
            selectedDate.getMonth() === now.getMonth() &&
            selectedDate.getFullYear() === now.getFullYear();

        while (true) {
            const slotStart = new Date(cursor);
            const slotEnd = new Date(slotStart.getTime() + minutesToMs(duration));

            // חריגה משעות הפעילות
            if (slotEnd > dayEnd) break;

            // סינון שעות שעברו
            if (isToday && slotStart < now) {
                cursor = new Date(cursor.getTime() + minutesToMs(duration));
                continue;
            }

            // בדיקת התנגשויות
            const hasConflict =
                dayAppointments.some(appt =>
                    BLOCKING_STATUSES.includes(appt.status) &&
                    intervalsOverlap(slotStart, slotEnd, new Date(appt.start), new Date(new Date(appt.start).getTime() + minutesToMs(appt.service.duration)))
                ) ||
                dayBlocks.some(block =>
                    intervalsOverlap(slotStart, slotEnd, new Date(block.start), new Date(block.end))
                );

            if (!hasConflict) {
                slots.push(slotStart);
            }

            // קפיצה במרווחים של הטיפול (אפשר לשנות לקפיצות קבועות של 15 דק' אם רוצים)
            cursor = new Date(cursor.getTime() + minutesToMs(duration));
        }

        return slots;
    }, [selectedDate, selectedService, dayAppointments, dayBlocks, openingHours]);


    // --- Logic: Submit ---

    const handleSubmit = async () => {
        if (!clientId) {
            Alert.alert("שגיאה", "לא נמצא משתמש מחובר.");
            return;
        }
        if (!selectedService || !selectedDate || !selectedTime || !selectedWorkerId) {
            Alert.alert("חסרים פרטים", "יש להשלים את כל שלבי ההזמנה.");
            return;
        }

        setSubmitting(true);

        try {
            const start = new Date(selectedDate);
            start.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

            const payload = {
                client: clientId,
                worker: selectedWorkerId,
                service: {
                    name: selectedService.name,
                    duration: selectedService.duration,
                    price: selectedService.price,
                },
                start: start.toISOString(),
            };

            const res = await apiFetch("/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setBookingSuccess(true);
                Alert.alert("איזה כיף!", "התור נקבע בהצלחה 🎉");
            } else {
                const errData = await res.json();
                Alert.alert("שגיאה", errData?.message || "תקלה בקביעת התור");
            }

        } catch (err) {
            Alert.alert("שגיאה", "תקלה בתקשורת עם השרת");
        } finally {
            setSubmitting(false);
        }
    };


    // --- Render Helpers ---

    const renderOpeningHours = useMemo(() => {
        if (!openingHours) return null;
        return DAY_KEYS.map(key => {
            const range = openingHours[key];
            const text = (range?.open && range?.close) ? `${range.open} - ${range.close}` : "סגור";
            return (
                <View key={key} style={styles.openingRow}>
                    <Text style={styles.openingDay}>{DAY_LABELS[key]}</Text>
                    <Text style={styles.openingTime}>{text}</Text>
                </View>
            );
        });
    }, [openingHours]);


    return (
        <View style={styles.container}>
            <Text style={styles.title}>הזמנת תור</Text>

            {/* Opening Hours Info */}
            <View style={styles.openingBox}>
                <Text style={styles.openingTitle}>שעות פעילות</Text>
                {renderOpeningHours}
                <Text style={styles.openingNote}>* קביעת תור אפשרית רק בשעות הפעילות הפנויות.</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* Step 1: Staff */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowStaffModal(true)}>
                    <View style={styles.stepNumberCircle}><Text style={styles.stepNumText}>1</Text></View>
                    <View>
                        <Text style={styles.stepLabel}>איש צוות</Text>
                        <Text style={styles.stepValue}>{selectedStaff?.name || "בחר..."}</Text>
                    </View>
                </TouchableOpacity>

                {/* Step 2: Service */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowServiceModal(true)}>
                    <View style={styles.stepNumberCircle}><Text style={styles.stepNumText}>2</Text></View>
                    <View>
                        <Text style={styles.stepLabel}>טיפול</Text>
                        <Text style={styles.stepValue}>
                            {selectedService ? `${selectedService.name} (${selectedService.price} ₪)` : "בחר..."}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Step 3: Date */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowDateModal(true)}>
                    <View style={styles.stepNumberCircle}><Text style={styles.stepNumText}>3</Text></View>
                    <View>
                        <Text style={styles.stepLabel}>תאריך</Text>
                        <Text style={styles.stepValue}>{selectedDate ? formatDate(selectedDate) : "בחר..."}</Text>
                    </View>
                </TouchableOpacity>

                {/* Step 4: Time */}
                <TouchableOpacity
                    style={[styles.stepRow, (!selectedDate || !selectedService) && { opacity: 0.5 }]}
                    onPress={() => setShowTimeModal(true)}
                    disabled={!selectedDate || !selectedService}
                >
                    <View style={styles.stepNumberCircle}><Text style={styles.stepNumText}>4</Text></View>
                    <View>
                        <Text style={styles.stepLabel}>שעה</Text>
                        <Text style={styles.stepValue}>{selectedTime ? formatTime(selectedTime) : "בחר..."}</Text>
                    </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.summaryBox}>
                    <TouchableOpacity
                        style={[styles.submitButton, (!selectedTime || submitting) && { opacity: 0.5 }]}
                        disabled={!selectedTime || submitting}
                        onPress={handleSubmit}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>אישור וקביעת תור</Text>}
                    </TouchableOpacity>

                    {bookingSuccess && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/torList")}>
                            <Text style={styles.secondaryButtonText}>מעבר לתורים שלי</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {/* --- Modals --- */}

            {/* 1. Staff Modal */}
            <Modal visible={showStaffModal} transparent animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>בחר איש צוות</Text>
                        {staffOptions.map(s => (
                            <TouchableOpacity key={s.id} style={styles.chip} onPress={() => {
                                setSelectedStaff(s);
                                setSelectedDate(null);
                                setSelectedTime(null);
                                setBlockedDatesMap({});
                                setShowStaffModal(false);
                                setCurrentStep(2);
                            }}>
                                <Text style={styles.chipText}>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* 2. Service Modal */}
            <Modal visible={showServiceModal} transparent animationType="slide" onRequestClose={() => setShowServiceModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>בחר טיפול</Text>
                        {services.map(s => (
                            <TouchableOpacity key={s.id} style={styles.chip} onPress={() => {
                                setSelectedService(s);
                                setSelectedDate(null);
                                setSelectedTime(null);
                                setShowServiceModal(false);
                                setCurrentStep(3);
                            }}>
                                <View style={styles.chipRow}>
                                    <Text style={styles.chipText}>{s.name}</Text>
                                    <Text style={styles.chipPrice}>{s.price} ₪</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* 3. Date Modal (Calendar) */}
            <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { height: '85%' }]}>
                        <Text style={styles.modalTitle}>בחירת תאריך</Text>
                        <CalendarList
                            minDate={dateToYMD(new Date())}
                            futureScrollRange={6}
                            dayComponent={(props) => (
                                <DayCell
                                    date={props.date}
                                    state={props.state}
                                    openingHours={openingHours}
                                    blockedDatesMap={blockedDatesMap}
                                    selectedDate={selectedDate}
                                    onPickDate={(dateString) => {
                                        setSelectedDate(new Date(dateString));
                                        setSelectedTime(null);
                                        setShowDateModal(false);
                                        setShowTimeModal(true); // Auto advance
                                    }}
                                />
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* 4. Time Modal */}
            <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { maxHeight: '80%' }]}>
                        <Text style={styles.modalTitle}>בחירת שעה</Text>
                        {loadingSlots ? (
                            <ActivityIndicator size="large" color="#000" />
                        ) : availableSlots.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Text style={styles.emptyText}>אין שעות פנויות בתאריך זה.</Text>
                                <TouchableOpacity onPress={() => { setShowTimeModal(false); setShowDateModal(true); }} style={styles.backButton}>
                                    <Text style={styles.backButtonText}>חזרה ליומן</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView>
                                <View style={styles.slotsGrid}>
                                    {availableSlots.map(slot => (
                                        <TouchableOpacity
                                            key={slot.toISOString()}
                                            style={styles.slotButton}
                                            onPress={() => {
                                                setSelectedTime(slot);
                                                setShowTimeModal(false);
                                            }}
                                        >
                                            <Text style={styles.slotText}>{formatTime(slot)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </View>
    );
}

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9fafb",
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
        color: "#111827",
    },
    openingBox: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    openingTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    openingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 2,
    },
    openingDay: { fontSize: 14, color: "#4b5563" },
    openingTime: { fontSize: 14, fontWeight: "500", color: "#111" },
    openingNote: {
        fontSize: 12,
        color: "#ef4444",
        marginTop: 8,
        textAlign: "center",
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    stepNumberCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    stepNumText: { color: "#fff", fontWeight: "bold" },
    stepLabel: { fontSize: 12, color: "#6b7280" },
    stepValue: { fontSize: 16, fontWeight: "600", color: "#111827", textAlign: "left" },

    summaryBox: {
        marginTop: 20,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
    },
    submitButton: {
        backgroundColor: "#111827",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 99,
        width: "100%",
        alignItems: "center",
    },
    submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    secondaryButton: {
        marginTop: 12,
        paddingVertical: 12,
        width: "100%",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#2563eb",
        borderRadius: 99,
    },
    secondaryButtonText: { color: "#2563eb", fontWeight: "600" },

    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
    },
    chip: {
        backgroundColor: "#f3f4f6",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    chipText: { fontSize: 16, color: "#111" },
    chipPrice: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },

    slotsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    slotButton: {
        width: "30%",
        backgroundColor: "#eff6ff",
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    slotText: { color: "#1e40af", fontWeight: "600" },

    emptyText: { textAlign: "center", fontSize: 16, color: "#6b7280", marginBottom: 20 },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "#e5e7eb",
        borderRadius: 99,
    },
    backButtonText: { color: "#374151", fontWeight: "600" },

    // Day Cell
    dayContainer: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
    },
    dayContainerBlocked: { backgroundColor: "#fee2e2" }, // אדום בהיר
    dayContainerSelected: { backgroundColor: "#2563eb" }, // כחול
    dayText: { fontSize: 14, color: "#111" },
    dayTextClosed: { color: "#d1d5db" }, // אפור
    dayTextToday: { fontWeight: "bold", textDecorationLine: "underline" },
    dayTextSelected: { color: "#fff", fontWeight: "bold" },
});
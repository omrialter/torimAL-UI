// -----------------------------------------------------------
// BookAppointmentScreen.tsx — כולל openingHours + חסימות (blocks)
// -----------------------------------------------------------

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
import type { DateData } from "react-native-calendars";
import { CalendarList } from "react-native-calendars";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useRouter } from "expo-router";
import { URL, apiFetch } from "../../services/api";

// ---------- Constants ----------

const API_URL = `${URL}/appointments`;
const BLOCKS_API_URL = `${URL}/blocks`;

type AppointmentStatus = "confirmed" | "canceled" | "completed" | "no_show";
const BLOCKING_STATUSES: AppointmentStatus[] = ["confirmed"];

// ---------- Types ----------

interface OpeningHoursRange {
    open: string | null;
    close: string | null;
}

interface OpeningHoursByDay {
    sunday: OpeningHoursRange;
    monday: OpeningHoursRange;
    tuesday: OpeningHoursRange;
    wednesday: OpeningHoursRange;
    thursday: OpeningHoursRange;
    friday: OpeningHoursRange;
    saturday: OpeningHoursRange;
}

interface BusinessUserRef {
    _id: string;
    name?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
}

interface BusinessServiceFromDb {
    _id: string;
    name: string;
    duration: number;
    price: number;
}

interface BusinessForBooking {
    _id: string;
    name: string;
    owner: BusinessUserRef;
    workers?: BusinessUserRef[];
    services?: BusinessServiceFromDb[];
    openingHours?: OpeningHoursByDay;
}

interface Service {
    id: string;
    name: string;
    duration: number;
    price: number;
}

interface AppointmentService {
    name: string;
    duration: number;
    price: number;
}

interface Appointment {
    _id: string;
    business: string;
    client: string;
    worker: string;
    service: AppointmentService;
    start: string;
    status: AppointmentStatus;
    notes: string | null;
}

interface ApptInterval {
    start: Date;
    end: Date;
    status: AppointmentStatus;
}

interface Staff {
    id: string;
    name: string;
    avatarUrl?: string;
}

/** Block מהשרת */
interface Block {
    _id: string;
    business: string;
    resource: string | null;
    start: string; // ISO
    end: string; // ISO
    reason: string;
    notes?: string | null;
}

interface BlockInterval {
    start: Date;
    end: Date;
}

// ---------- Helpers ----------

const dateToYMD = (date: Date) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;

const minutesToMs = (min: number) => min * 60 * 1000;

const getApptInterval = (appt: Appointment): ApptInterval => {
    const start = new Date(appt.start);
    const end = new Date(start.getTime() + minutesToMs(appt.service.duration));
    return { start, end, status: appt.status };
};

const getBlockInterval = (block: Block): BlockInterval => {
    return {
        start: new Date(block.start),
        end: new Date(block.end),
    };
};

const intervalsOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart;

const formatTime = (d: Date) =>
    d.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

const formatDate = (d: Date) =>
    d.toLocaleDateString("he-IL", { weekday: "long", day: "2-digit", month: "2-digit" });

// ---------------------------------------------
// OPENING HOURS SUPPORT
// ---------------------------------------------

const DAY_KEYS: (keyof OpeningHoursByDay)[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];

const DAY_LABELS: Record<keyof OpeningHoursByDay, string> = {
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
    business: BusinessForBooking | null
): { dayStart: Date; dayEnd: Date } | null => {
    if (!business?.openingHours) return null;

    const jsDay = date.getDay(); // 0 = Sunday
    const key = DAY_KEYS[jsDay];
    const range = business.openingHours[key];

    if (!range || !range.open || !range.close) return null;

    const dayStart = applyTimeToDate(date, range.open);
    const dayEnd = applyTimeToDate(date, range.close);

    if (dayEnd <= dayStart) return null;

    return { dayStart, dayEnd };
};

// ---------------------------------------------
// DAY CELL (CalendarList dayComponent)
// ---------------------------------------------

function DayCell({
    date,
    state,
    business,
    blockedDatesMap,
    selectedDate,
    onPickDate,
}: {
    date?: DateData;
    state?: string;
    business: BusinessForBooking | null;
    blockedDatesMap: { [dateStr: string]: boolean };
    selectedDate: Date | null;
    onPickDate: (dateString: string) => void;
}) {
    if (!date?.dateString) return <View />;

    const d = new Date(date.dateString);
    const opening = getOpeningRangeForDate(d, business);
    const isBlockedDay = !!blockedDatesMap[date.dateString];
    const isClosed = !opening || isBlockedDay;

    const isSelected = !!selectedDate && date.dateString === dateToYMD(selectedDate);
    const isToday = state === "today";

    return (
        <TouchableOpacity
            onPress={() => {
                if (isClosed) {
                    Alert.alert(
                        isBlockedDay ? "היום חסום (חופשה / אירוע מיוחד)" : "העסק סגור ביום זה",
                        "בחר יום אחר מתוך הימים הפתוחים."
                    );
                    return;
                }
                onPickDate(date.dateString);
            }}
            activeOpacity={isClosed ? 1 : 0.6}
        >
            <View
                style={[
                    styles.dayContainer,
                    isBlockedDay && styles.dayContainerBlocked,
                    isSelected && styles.dayContainerSelected,
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
}

// -----------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------

const BookAppointmentScreen = () => {
    const { user, userToken } = useAuth();
    const { businessData } = useBusinessDataContext();
    const business = businessData as BusinessForBooking | null;
    const router = useRouter();

    const clientId = user?._id || (user as any)?.id || (user as any)?.userId || null;

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [notes, setNotes] = useState("");

    const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
    const [loadingDayAppointments, setLoadingDayAppointments] = useState(false);

    /** חסימות ליום שנבחר (עבור worker הנבחר + חסימות כלליות לעסק) */
    const [dayBlocks, setDayBlocks] = useState<Block[]>([]);
    const [loadingDayBlocks, setLoadingDayBlocks] = useState(false);

    /**
     * מפת ימים חסומים לטווח (לצביעה ביומן) –
     * חשוב: חייב להיות תלוי ב-worker הנבחר כדי לא "לזלוג" חופשות בין עובדים.
     */
    const [blockedDatesMap, setBlockedDatesMap] = useState<{ [dateStr: string]: boolean }>({});

    const [submitting, setSubmitting] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Services
    const services = useMemo(() => {
        if (!business?.services) return [];
        return business.services.map((s) => ({
            id: s._id,
            name: s.name,
            duration: s.duration,
            price: s.price,
        }));
    }, [business]);

    // Staff
    const staffOptions = useMemo(() => {
        if (!business) return [];

        if (business.workers?.length)
            return business.workers.map((w) => ({
                id: w._id,
                name: w.name || w.fullName || "עובד",
                avatarUrl: w.avatarUrl,
            }));

        return [
            {
                id: business.owner?._id,
                name: business.owner?.name || "איש צוות",
            },
        ];
    }, [business]);

    useEffect(() => {
        if (!selectedStaff && staffOptions.length === 1) setSelectedStaff(staffOptions[0]);
    }, [staffOptions, selectedStaff]);

    /** worker בפועל שנשתמש בו לכל החישובים */
    const selectedWorkerId = useMemo(() => {
        return selectedStaff?.id || staffOptions[0]?.id || null;
    }, [selectedStaff, staffOptions]);

    // Load appointments for selected day
    useEffect(() => {
        const load = async () => {
            if (!selectedDate || !userToken) return;
            if (!selectedWorkerId) return;

            setLoadingDayAppointments(true);

            try {
                const dateStr = dateToYMD(selectedDate);
                const res = await apiFetch(`${API_URL}/by-day?date=${dateStr}&worker=${selectedWorkerId}`);
                setDayAppointments(res.ok ? await res.json() : []);
            } catch {
                setDayAppointments([]);
            } finally {
                setLoadingDayAppointments(false);
            }
        };

        load();
    }, [selectedDate, selectedWorkerId, userToken]);

    // Load blocks for selected day (business-wide + selected worker)
    useEffect(() => {
        const loadBlocks = async () => {
            if (!selectedDate || !userToken) return;
            if (!selectedWorkerId) return;

            setLoadingDayBlocks(true);

            try {
                const dateStr = dateToYMD(selectedDate);
                const res = await apiFetch(`${BLOCKS_API_URL}/by-day?date=${dateStr}&worker=${selectedWorkerId}`);
                const data = res.ok ? await res.json() : [];
                setDayBlocks(data);
            } catch {
                setDayBlocks([]);
            } finally {
                setLoadingDayBlocks(false);
            }
        };

        loadBlocks();
    }, [selectedDate, selectedWorkerId, userToken]);

    // Range blocks for calendar coloring (DEPENDS ON WORKER)
    useEffect(() => {
        const loadRangeBlocks = async () => {
            if (!userToken || !business) return;
            if (!selectedWorkerId) {
                setBlockedDatesMap({});
                return;
            }

            try {
                const fromDate = new Date();
                const toDate = new Date();
                toDate.setMonth(toDate.getMonth() + 6);

                const fromStr = dateToYMD(fromDate);
                const toStr = dateToYMD(toDate);

                // חשוב: מסננים לפי worker כדי לא להביא חופשות של עובדים אחרים
                const res = await apiFetch(
                    `${BLOCKS_API_URL}/list?from=${fromStr}&to=${toStr}&resource=${selectedWorkerId}`
                );

                if (!res.ok) {
                    setBlockedDatesMap({});
                    return;
                }

                const blocks: Block[] = await res.json();

                const map: { [dateStr: string]: boolean } = {};

                // מסמנים יום כחסום אם יש בלוק שמכסה את כל היום (לפי שעות פתיחה)
                // ושייך לכל העסק (resource=null) או לעובד הנבחר
                blocks.forEach((block) => {
                    const isRelevant =
                        block.resource === null || block.resource === selectedWorkerId;

                    if (!isRelevant) return;

                    const blockStart = new Date(block.start);
                    const blockEnd = new Date(block.end);

                    const cur = new Date(blockStart);
                    cur.setHours(0, 0, 0, 0);

                    const endDay = new Date(blockEnd);
                    endDay.setHours(0, 0, 0, 0);

                    while (cur <= endDay) {
                        const ymd = dateToYMD(cur);
                        const opening = getOpeningRangeForDate(cur, business);

                        // אם העסק סגור – DayCell כבר יטפל בזה (opening null),
                        // אבל נשאיר גם כאן "חסימה" כדי לאפשר UI עקבי אם תרצה.
                        if (!opening) {
                            map[ymd] = true;
                        } else {
                            const { dayStart, dayEnd } = opening;

                            // חסימה שמכסה את כל שעות הפעילות של אותו היום
                            if (blockStart <= dayStart && blockEnd >= dayEnd) {
                                map[ymd] = true;
                            }
                        }

                        cur.setDate(cur.getDate() + 1);
                    }
                });

                setBlockedDatesMap(map);
            } catch (err) {
                console.log("loadRangeBlocks error", err);
                setBlockedDatesMap({});
            }
        };

        loadRangeBlocks();
    }, [userToken, business, selectedWorkerId]);

    // Available slots
    const availableSlots = useMemo(() => {
        if (!selectedDate || !selectedService) return [];

        const opening = getOpeningRangeForDate(selectedDate, business);
        if (!opening) return [];

        const { dayStart, dayEnd } = opening;
        const duration = selectedService.duration;

        const appts = dayAppointments
            .filter((a) => BLOCKING_STATUSES.includes(a.status))
            .map(getApptInterval);

        const blockIntervals: BlockInterval[] = dayBlocks.map(getBlockInterval);

        const slots: Date[] = [];
        let cursor = new Date(dayStart);

        while (true) {
            const slotStart = new Date(cursor);
            const slotEnd = new Date(slotStart.getTime() + minutesToMs(duration));
            if (slotEnd > dayEnd) break;

            const conflictWithAppt = appts.some((a) => intervalsOverlap(slotStart, slotEnd, a.start, a.end));
            const conflictWithBlock = blockIntervals.some((b) => intervalsOverlap(slotStart, slotEnd, b.start, b.end));

            if (!conflictWithAppt && !conflictWithBlock) {
                slots.push(slotStart);
            }

            cursor = new Date(cursor.getTime() + minutesToMs(duration));
        }

        return slots;
    }, [selectedDate, selectedService, dayAppointments, dayBlocks, business]);

    // Opening hours lines
    const openingLines = useMemo(() => {
        if (!business?.openingHours) return [];
        const lines: { day: string; text: string }[] = [];

        DAY_KEYS.forEach((key) => {
            const range = business.openingHours![key];
            let text = "סגור";
            if (range && range.open && range.close) {
                text = `${range.open} - ${range.close}`;
            }
            lines.push({ day: DAY_LABELS[key], text });
        });

        return lines;
    }, [business]);

    // Submit
    const handleSubmit = async () => {
        if (!clientId || !selectedService || !selectedDate || !selectedTime)
            return Alert.alert("שגיאה", "יש למלא את כל השלבים");

        const workerId = selectedWorkerId;
        if (!workerId) return Alert.alert("שגיאה", "בחר איש צוות");

        setSubmitting(true);

        try {
            const start = new Date(selectedDate);
            start.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

            const body = {
                client: clientId,
                worker: workerId,
                service: {
                    name: selectedService.name,
                    duration: selectedService.duration,
                    price: selectedService.price,
                },
                start: start.toISOString(),
                notes,
            };

            const res = await apiFetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.status === 201) {
                setBookingSuccess(true);
                Alert.alert("הצליח!", "התור נקבע בהצלחה");
                return;
            }

            Alert.alert("שגיאה", await res.text());
        } catch {
            Alert.alert("שגיאה", "תקלה בשרת / אינטרנט");
        } finally {
            setSubmitting(false);
        }
    };

    // Render
    return (
        <View style={styles.container}>
            <Text style={styles.title}>הזמנת תור</Text>

            {/* Opening hours */}
            {openingLines.length > 0 && (
                <View style={styles.openingBox}>
                    <Text style={styles.openingTitle}>שעות פעילות העסק</Text>
                    {openingLines.map((line, idx) => (
                        <View key={idx} style={styles.openingRow}>
                            <Text style={styles.openingDay}>{line.day}</Text>
                            <Text style={styles.openingTime}>{line.text}</Text>
                        </View>
                    ))}
                    <Text style={styles.openingNote}>
                        * קביעת תורים אפשרית רק בשעות הפעילות של העסק, ולא בזמן חסימה ביומן.
                    </Text>
                </View>
            )}

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* STEP 1 */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowStaffModal(true)}>
                    <View style={styles.stepNumberCircle}>
                        <Text style={{ color: "#fff" }}>1</Text>
                    </View>
                    <View>
                        <Text style={styles.stepLabel}>איש צוות</Text>
                        <Text style={styles.stepValue}>{selectedStaff?.name || "בחר איש צוות"}</Text>
                    </View>
                </TouchableOpacity>

                {/* STEP 2 */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowServiceModal(true)}>
                    <View style={styles.stepNumberCircle}>
                        <Text style={{ color: "#fff" }}>2</Text>
                    </View>
                    <View>
                        <Text style={styles.stepLabel}>טיפול</Text>
                        <Text style={styles.stepValue}>
                            {selectedService ? `${selectedService.name} · ${selectedService.price} ₪` : "בחר טיפול"}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* STEP 3 */}
                <TouchableOpacity style={styles.stepRow} onPress={() => setShowDateModal(true)}>
                    <View style={styles.stepNumberCircle}>
                        <Text style={{ color: "#fff" }}>3</Text>
                    </View>
                    <View>
                        <Text style={styles.stepLabel}>יום</Text>
                        <Text style={styles.stepValue}>{selectedDate ? formatDate(selectedDate) : "בחר יום"}</Text>
                    </View>
                </TouchableOpacity>

                {/* STEP 4 */}
                <TouchableOpacity
                    style={styles.stepRow}
                    onPress={() => setShowTimeModal(true)}
                    disabled={!selectedDate || !selectedService}
                >
                    <View style={styles.stepNumberCircle}>
                        <Text style={{ color: "#fff" }}>4</Text>
                    </View>
                    <View>
                        <Text style={styles.stepLabel}>שעה</Text>
                        <Text style={styles.stepValue}>{selectedTime ? formatTime(selectedTime) : "בחר שעה"}</Text>
                    </View>
                </TouchableOpacity>

                {/* SUBMIT BOX */}
                <View style={styles.summaryBox}>
                    <TouchableOpacity
                        style={[styles.submitButton, (!selectedTime || submitting) && { opacity: 0.5 }]}
                        disabled={!selectedTime || submitting}
                        onPress={handleSubmit}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>אישור וקביעת תור</Text>
                        )}
                    </TouchableOpacity>

                    {bookingSuccess && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/torList")}>
                            <Text style={styles.secondaryButtonText}>לעמוד התורים שלי</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* STAFF MODAL */}
            <Modal visible={showStaffModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard2}>
                        <Text style={styles.modalTitle}>בחר איש צוות</Text>
                        {staffOptions.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.chip}
                                onPress={() => {
                                    setSelectedStaff(s);
                                    setSelectedDate(null);
                                    setSelectedTime(null);
                                    setBlockedDatesMap({}); // כדי שלא יישארו "צביעות" מהעובד הקודם עד שהטעינה תסתיים
                                    setShowStaffModal(false);
                                    setCurrentStep(2);
                                }}
                            >
                                <Text>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* SERVICE MODAL */}
            <Modal visible={showServiceModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard2}>
                        <Text style={styles.modalTitle}>בחר טיפול</Text>
                        {services.map((srv) => (
                            <TouchableOpacity
                                key={srv.id}
                                style={styles.chip}
                                onPress={() => {
                                    setSelectedService(srv);
                                    setSelectedDate(null);
                                    setSelectedTime(null);
                                    setShowServiceModal(false);
                                    setCurrentStep(3);
                                }}
                            >
                                <View style={styles.chipRow}>
                                    <Text style={styles.chipText}>{srv.name}</Text>
                                    <Text style={styles.chipPrice}>{srv.price} ₪</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* DATE MODAL */}
            <Modal visible={showDateModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { height: "80%" }]}>
                        <Text style={styles.modalTitle}>בחירת יום</Text>

                        <CalendarList
                            minDate={dateToYMD(new Date())}
                            futureScrollRange={6}
                            dayComponent={(props: any) => (
                                <DayCell
                                    date={props?.date as DateData | undefined}
                                    state={props?.state as string | undefined}
                                    business={business}
                                    blockedDatesMap={blockedDatesMap}
                                    selectedDate={selectedDate}
                                    onPickDate={(dateString) => {
                                        const chosen = new Date(dateString);
                                        setSelectedDate(chosen);
                                        setSelectedTime(null);
                                        setShowDateModal(false);
                                        setCurrentStep(4);
                                    }}
                                />
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* TIME MODAL */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>בחר שעה</Text>

                        {loadingDayAppointments || loadingDayBlocks ? (
                            <ActivityIndicator />
                        ) : availableSlots.length === 0 ? (
                            <>
                                <Text style={styles.emptyText}>
                                    אין שעות פנויות ביום זה. ייתכן שכל היום תפוס, שהעסק סגור, או שקיימת חסימה (חופשה / יום מיוחד).
                                </Text>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setShowTimeModal(false);
                                        setShowDateModal(true);
                                    }}
                                >
                                    <Text style={styles.backButtonText}>חזרה לבחירת יום</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <ScrollView>
                                {availableSlots.map((slot) => (
                                    <TouchableOpacity
                                        key={slot.toISOString()}
                                        style={styles.slotButton}
                                        onPress={() => {
                                            setSelectedTime(slot);
                                            setShowTimeModal(false);
                                            setCurrentStep(5);
                                        }}
                                    >
                                        <Text style={styles.slotText}>{formatTime(slot)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// -----------------------------------------------------------
// STYLES
// -----------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f3f4f6",
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 12,
    },

    // Opening hours card
    openingBox: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: 12,
        marginBottom: 16,
        elevation: 2,
    },
    openingTitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
        textAlign: "center",
    },
    openingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 2,
    },
    openingDay: {
        fontSize: 13,
        color: "#4b5563",
    },
    openingTime: {
        fontSize: 13,
        fontWeight: "500",
        color: "#111827",
    },
    openingNote: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 8,
        textAlign: "center",
    },

    stepRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        alignItems: "center",
        elevation: 3,
    },
    stepNumberCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#1d4ed8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    stepLabel: { fontSize: 12, color: "#6b7280" },
    stepValue: { fontSize: 16, fontWeight: "600" },

    summaryBox: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 16,
        marginTop: 24,
    },

    submitButton: {
        backgroundColor: "#000",
        paddingVertical: 12,
        borderRadius: 24,
        alignItems: "center",
    },
    submitButtonText: {
        color: "#fff",
        fontWeight: "700",
    },
    secondaryButton: {
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#1d4ed8",
        alignItems: "center",
    },
    secondaryButtonText: {
        color: "#1d4ed8",
        fontWeight: "600",
    },

    modalBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    modalCard: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
    },
    modalCard2: {
        backgroundColor: "#fff",
        padding: 20,
        paddingBottom: 50,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
        textAlign: "center",
    },

    chip: {
        padding: 14,
        backgroundColor: "#f3f4f6",
        borderRadius: 16,
        marginBottom: 10,
    },
    chipRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    chipText: {
        fontSize: 14,
        color: "#111827",
    },
    chipPrice: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },

    emptyText: {
        textAlign: "center",
        color: "#6b7280",
        marginTop: 16,
        marginBottom: 12,
    },

    backButton: {
        alignSelf: "center",
        marginTop: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1d4ed8",
        backgroundColor: "#eef2ff",
    },
    backButtonText: {
        color: "#1d4ed8",
        fontWeight: "600",
        fontSize: 13,
    },

    slotButton: {
        paddingVertical: 12,
        backgroundColor: "#f3f4f6",
        borderRadius: 16,
        marginBottom: 12,
    },
    slotText: { textAlign: "center", fontSize: 16 },

    // day component styles
    dayContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginVertical: 2,
    },
    dayContainerSelected: {
        backgroundColor: "#1d4ed8",
    },
    dayContainerBlocked: {
        backgroundColor: "#fee2e2",
    },
    dayText: {
        fontSize: 14,
        color: "#111827",
    },
    dayTextClosed: {
        color: "#d1d5db",
    },
    dayTextToday: {
        fontWeight: "700",
        textDecorationLine: "underline",
    },
    dayTextSelected: {
        color: "#ffffff",
        fontWeight: "700",
    },
});

export default BookAppointmentScreen;

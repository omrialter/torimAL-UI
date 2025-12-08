// app/bookAppointment/BookAppointmentScreen.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { CalendarList } from "react-native-calendars";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useRouter } from "expo-router";
import { URL, apiFetch } from "../../services/api";


// ---------- Constants & Types ----------

const API_URL = `${URL}/appointments`;

type AppointmentStatus = "confirmed" | "canceled" | "completed" | "no_show";

interface CalendarDay {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
}

interface Service {
    id: string;
    name: string;
    duration: number; // minutes
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
    start: string; // ISO
    status: AppointmentStatus;
    notes: string | null;
    createdAt: string;
}

interface Staff {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface ApptInterval {
    start: Date;
    end: Date;
    status: AppointmentStatus;
}

type StepNumber = 1 | 2 | 3 | 4 | 5;

interface StepRowProps {
    stepNumber: StepNumber;
    label: string;
    value: string;
    active: boolean;
    disabled?: boolean;
    onPress: () => void;
}

// ---- טיפוסים מינימליים ל-businessData אחרי populate ----

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
    owner: BusinessUserRef; // תמיד אובייקט אחרי populate
    workers?: BusinessUserRef[]; // מערך אובייקטים אחרי populate
    services?: BusinessServiceFromDb[];
}

// סטטוסים חוסמים כמו בצד שרת
const BLOCKING_STATUSES: AppointmentStatus[] = ["confirmed"];

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;

// ---------- Helpers ----------

const dateToYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString("he-IL", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    });
};

const minutesToMs = (min: number): number => min * 60 * 1000;

// מייצר אינטרוול [start, end) לכל תור, כמו בשרת
const getApptInterval = (appt: Appointment): ApptInterval => {
    const start = new Date(appt.start);
    const end = new Date(start.getTime() + minutesToMs(appt.service.duration));
    return { start, end, status: appt.status };
};

const intervalsOverlap = (
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
): boolean => {
    return startA < endB && endA > startB;
};

// ---------- Component ----------

const BookAppointmentScreen: React.FC = () => {
    const { user, userToken } = useAuth();
    console.log("👤 user from AuthContext (BookAppointment):", user);

    const { businessData } = useBusinessDataContext();
    const router = useRouter();

    // הטלת טיפוס על businessData בהתאם למה שהשרת מחזיר אחרי populate
    const business = businessData as BusinessForBooking | null;




    const clientId =
        (user as any)?._id ??
        (user as any)?.id ??
        (user as any)?.userId ??
        null;

    const [currentStep, setCurrentStep] = useState<StepNumber>(1);

    // בחירות המשתמש
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [notes, setNotes] = useState<string>(""); // כרגע לא בשימוש ב־UI, אבל נשלח לשרת

    // מודלים
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // ---- בניית רשימת שירותים מה-business.services ----
    const services: Service[] = useMemo(() => {
        if (!business?.services || business.services.length === 0) {
            return [];
        }

        return business.services.map((srv) => ({
            id: srv._id || srv.name,
            name: srv.name,
            duration: srv.duration,
            price: srv.price,
        }));
    }, [business]);

    // ---- בניית רשימת עובדים מה-business.workers או מה-owner ----
    const staffOptions: Staff[] = useMemo(() => {
        if (!business) return [];

        const rawWorkers = business.workers || [];
        const owner = business.owner;

        // 1. אם יש workers – הם כבר אובייקטים מאוכלסים (populate)
        if (rawWorkers.length > 0) {
            return rawWorkers.map((w) => ({
                id: w._id,
                name: w.name || w.fullName || w.phone || "איש צוות",
                avatarUrl: w.avatarUrl,
            }));
        }

        // 2. fallback: owner כאיש הצוות היחיד
        if (owner && owner._id) {
            return [
                {
                    id: owner._id,
                    name: owner.name || owner.fullName || business.name || "איש צוות",
                    avatarUrl: owner.avatarUrl,
                },
            ];
        }

        // 3. fallback אחרון – המשתמש המחובר
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

    // אם יש רק עובד אחד – נבחר אותו אוטומטית
    useEffect(() => {
        if (!selectedStaff && staffOptions.length === 1) {
            setSelectedStaff(staffOptions[0]);
        }
    }, [staffOptions, selectedStaff]);

    // תורים קיימים ליום הנבחר
    const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
    const [loadingDayAppointments, setLoadingDayAppointments] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ---------- הבאת תורים קיימים ליום שנבחר (לפי עובד) ----------

    useEffect(() => {
        const fetchDayAppointments = async () => {
            if (!selectedDate || !userToken) return;

            // fallback: אם לא נבחר איש צוות – ניקח את הראשון ברשימה, אם יש
            const workerId =
                selectedStaff?.id ||
                (staffOptions.length > 0 ? staffOptions[0].id : null);

            if (!workerId) return;

            setLoadingDayAppointments(true);

            try {
                const dateStr = dateToYMD(selectedDate);
                const res = await apiFetch(
                    `${API_URL}/by-day?date=${encodeURIComponent(
                        dateStr
                    )}&worker=${encodeURIComponent(workerId)}`,
                    { method: "GET" }
                );

                if (!res.ok) {
                    console.log("Error fetching day appointments", await res.text());
                    setDayAppointments([]);
                    return;
                }

                const data: Appointment[] = await res.json();
                setDayAppointments(data || []);
            } catch (err) {
                console.error("Error fetching day appointments:", err);
                setDayAppointments([]);
            } finally {
                setLoadingDayAppointments(false);
            }
        };

        fetchDayAppointments();
    }, [selectedDate, userToken, selectedStaff, staffOptions]);

    // ---------- יצירת שעות פנויות ----------

    const availableSlots: Date[] = useMemo(() => {
        if (!selectedDate || !selectedService) return [];

        const serviceDuration = selectedService.duration;
        const STEP_MINUTES = serviceDuration;

        const slots: Date[] = [];

        const dayStart = new Date(selectedDate);
        dayStart.setHours(WORK_START_HOUR, 0, 0, 0);

        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

        const apptIntervals: ApptInterval[] = dayAppointments
            .filter((a) => BLOCKING_STATUSES.includes(a.status))
            .map(getApptInterval);

        let cursor = new Date(dayStart);

        while (true) {
            const slotStart = new Date(cursor);
            const slotEnd = new Date(
                slotStart.getTime() + minutesToMs(serviceDuration)
            );

            if (slotEnd > dayEnd) break;

            const hasConflict = apptIntervals.some((appt) =>
                intervalsOverlap(slotStart, slotEnd, appt.start, appt.end)
            );

            if (!hasConflict) {
                slots.push(slotStart);
            }

            cursor = new Date(cursor.getTime() + minutesToMs(STEP_MINUTES));
        }

        return slots;
    }, [selectedDate, selectedService, dayAppointments]);

    // ---------- שליחת התור לשרת ----------

    const handleSubmit = async () => {
        console.log("▶ handleSubmit pressed");

        console.log("📊 state before submit:", {
            clientId,
            hasToken: !!userToken,
            selectedService: selectedService ? selectedService.name : null,
            selectedDate: selectedDate ? selectedDate.toISOString() : null,
            selectedTime: selectedTime ? selectedTime.toISOString() : null,
        });

        if (!clientId || !userToken || !selectedService || !selectedDate || !selectedTime) {
            console.log("⛔ Missing data, aborting submit");

            let msg = "יש למלא את כל השלבים לפני קביעת התור.";

            if (!userToken) msg = "נראה שאתה לא מחובר, נסה להתחבר מחדש.";
            else if (!clientId) msg = "לא זוהה לקוח מחובר, נסה לצאת ולהיכנס שוב.";
            else if (!selectedService) msg = "בחר טיפול לפני קביעת תור.";
            else if (!selectedDate) msg = "בחר יום לפני קביעת תור.";
            else if (!selectedTime) msg = "בחר שעה לפני קביעת תור.";

            Alert.alert("לא ניתן לקבוע תור", msg);
            return;
        }

        const workerId =
            selectedStaff?.id ||
            (staffOptions.length > 0 ? staffOptions[0].id : null);

        if (!workerId) {
            Alert.alert("שגיאה", "לא נבחר איש צוות");
            return;
        }

        setSubmitting(true);

        try {
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(
                selectedTime.getHours(),
                selectedTime.getMinutes(),
                0,
                0
            );

            const body = {
                client: clientId,
                worker: workerId,
                service: {
                    name: selectedService.name,
                    duration: selectedService.duration,
                    price: selectedService.price,
                },
                start: startDateTime.toISOString(),
                notes: notes || "",
            };

            console.log("📤 sending POST /appointments with body:", body);

            const res = await apiFetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            console.log("📥 POST /appointments status:", res.status);

            if (res.status === 201) {
                const appt: Appointment = await res.json();
                console.log("✅ created appointment", appt);
                Alert.alert("הצליח!", "התור נקבע בהצלחה");
                setBookingSuccess(true);
                return;
            }

            if (res.status === 409) {
                Alert.alert(
                    "התור נתפס",
                    "מישהו אחר תפס את השעה הזאת, נסה לבחור שעה אחרת."
                );
                return;
            }

            if (res.status === 403) {
                const txt = await res.text();

                let msg = "לא ניתן לקבוע יותר משני תורים במקביל במצב מאושר.";

                try {
                    const json = JSON.parse(txt);
                    if (json.error === "MAX_CONFIRMED_REACHED" && json.message) {
                        msg = json.message;
                    } else if (json.message) {
                        msg = json.message;
                    }
                } catch {
                    if (txt) msg = txt;
                }

                Alert.alert("הגבלת מספר תורים", msg);
                return;
            }

            const txt = await res.text();
            console.log("❌ POST /appointments non-201 status:", res.status);
            console.log("❌ POST /appointments body:", txt);

            let serverMsg = "לא הצלחנו לקבוע את התור, נסה שוב.";
            try {
                const json = JSON.parse(txt);
                if (json?.error) serverMsg = json.error;
                if (json?.message) serverMsg = json.message;
            } catch {
                if (txt) serverMsg = txt;
            }

            Alert.alert("שגיאה", serverMsg);
        } catch (err) {
            console.error("❌ handleSubmit error:", err);
            Alert.alert("שגיאה", "תקלה בשרת / אינטרנט");
        } finally {
            setSubmitting(false);
        }
    };


    // ---------- Render ----------

    return (
        <View style={styles.container}>
            <Text style={styles.title}>הזמנת תור</Text>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. בחירת איש צוות */}
                <StepRow
                    stepNumber={1}
                    label="איש צוות"
                    value={
                        selectedStaff?.name ||
                        (staffOptions.length > 0
                            ? staffOptions[0].name
                            : "בחר איש צוות")
                    }
                    active={currentStep === 1}
                    onPress={() => {
                        if (staffOptions.length > 0) {
                            setShowStaffModal(true);
                            setCurrentStep(1);
                        }
                    }}
                    disabled={staffOptions.length === 0}
                />

                {/* 2. בחירת טיפול */}
                <StepRow
                    stepNumber={2}
                    label="טיפול"
                    value={
                        services.length === 0
                            ? "אין טיפולים מוגדרים לעסק"
                            : selectedService?.name || "בחירת טיפול"
                    }
                    active={currentStep === 2}
                    onPress={() => {
                        if (services.length > 0) {
                            setShowServiceModal(true);
                            setCurrentStep(2);
                        }
                    }}
                    disabled={services.length === 0}
                />

                {/* 3. בחירת יום */}
                <StepRow
                    stepNumber={3}
                    label="יום"
                    value={selectedDate ? formatDate(selectedDate) : "בחירת יום"}
                    active={currentStep === 3}
                    onPress={() => {
                        setShowDateModal(true);
                        setCurrentStep(3);
                    }}
                    disabled={!selectedService}
                />

                {/* 4. בחירת שעה */}
                <StepRow
                    stepNumber={4}
                    label="שעה"
                    value={selectedTime ? formatTime(selectedTime) : "בחירת תור"}
                    active={currentStep === 4}
                    onPress={() => {
                        setShowTimeModal(true);
                        setCurrentStep(4);
                    }}
                    disabled={!selectedService || !selectedDate}
                />

                {/* 5. סיכום */}
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>לאישור והזמנת התור</Text>
                    {selectedService && selectedDate && selectedTime ? (
                        <Text style={styles.summaryText}>
                            {`${formatDate(selectedDate)} בשעה ${formatTime(
                                selectedTime
                            )} ל${selectedService.name}`}
                        </Text>
                    ) : (
                        <Text style={styles.summaryText}>
                            מלא את כל השלבים למעלה כדי לראות את סיכום התור.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!selectedService ||
                                !selectedDate ||
                                !selectedTime ||
                                submitting) && { opacity: 0.5 },
                        ]}
                        disabled={
                            !selectedService ||
                            !selectedDate ||
                            !selectedTime ||
                            submitting
                        }
                        onPress={handleSubmit}
                    >
                        {submitting ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.submitButtonText}>לחץ להזמנת התור</Text>
                        )}
                    </TouchableOpacity>

                    {bookingSuccess && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push("/torList")}
                        >
                            <Text style={styles.secondaryButtonText}>
                                לעמוד התורים שלך
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* -------- מודל בחירת איש צוות -------- */}
            <Modal visible={showStaffModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>בחירת איש צוות</Text>
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
                                        setCurrentStep(2);
                                        setSelectedDate(null);
                                        setSelectedTime(null);
                                    }}
                                >
                                    <Text style={styles.chipText}>{staff.name}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </Modal>

            {/* -------- מודל בחירת טיפול -------- */}
            <Modal visible={showServiceModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>בחירת טיפול</Text>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {services.length === 0 ? (
                            <Text style={styles.emptyText}>
                                אין טיפולים מוגדרים לעסק.
                            </Text>
                        ) : (
                            services.map((srv) => (
                                <TouchableOpacity
                                    key={srv.id}
                                    style={styles.chip}
                                    onPress={() => {
                                        setSelectedService(srv);
                                        setShowServiceModal(false);
                                        setCurrentStep(3);
                                        setSelectedDate(null);
                                        setSelectedTime(null);
                                    }}
                                >
                                    <Text style={styles.chipPrice}>{srv.price}</Text>
                                    <Text style={styles.chipText}>{srv.name}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </Modal>

            {/* -------- מודל בחירת יום (CalendarList) -------- */}
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
                                setCurrentStep(4);
                                setSelectedTime(null);
                            }}
                            minDate={dateToYMD(new Date())}
                            pastScrollRange={0}
                            futureScrollRange={8}
                            scrollEnabled
                            showScrollIndicator
                            theme={{
                                todayTextColor: "#1d4ed8",
                                selectedDayBackgroundColor: "#1d4ed8",
                            }}
                            markedDates={
                                selectedDate
                                    ? ({
                                        [dateToYMD(selectedDate)]: {
                                            selected: true,
                                            selectedColor: "#1d4ed8",
                                        },
                                    } as any)
                                    : {}
                            }
                        />

                        <Text style={styles.footerNote}>
                            * ימים ללא תורים פנויים מסומנים באדום (פיצ'ר להמשך 😉)
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* -------- מודל בחירת שעה -------- */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>בחירת תור</Text>
                            <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingDayAppointments ? (
                            <ActivityIndicator />
                        ) : availableSlots.length === 0 ? (
                            <Text style={styles.emptyText}>
                                אין שעות פנויות בתאריך זה עבור טיפול זה.
                            </Text>
                        ) : (
                            <ScrollView style={{ maxHeight: "70%" }}>
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

// ---------- קומפוננטת שורה של צעד ----------

const StepRow: React.FC<StepRowProps> = ({
    stepNumber,
    label,
    value,
    active,
    onPress,
    disabled,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.stepRow,
                active && styles.stepRowActive,
                disabled && { opacity: 0.4 },
            ]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
        >
            <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>{stepNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.stepLabel}>{label}</Text>
                <Text style={styles.stepValue}>{value}</Text>
            </View>
        </TouchableOpacity>
    );
};

// ---------- Styles ----------

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
        marginBottom: 16,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    stepRowActive: {
        borderWidth: 1,
        borderColor: "#1d4ed8",
    },
    stepNumberCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#1d4ed8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    stepNumberText: {
        color: "#fff",
        fontWeight: "700",
    },
    stepLabel: {
        fontSize: 12,
        color: "#6b7280",
    },
    stepValue: {
        fontSize: 16,
        fontWeight: "500",
    },
    summaryBox: {
        marginTop: 24,
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 12,
    },
    submitButton: {
        backgroundColor: "#000",
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 4,
    },
    submitButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    secondaryButton: {
        marginTop: 12,
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#1d4ed8",
        backgroundColor: "#eef2ff",
    },
    secondaryButtonText: {
        color: "#1d4ed8",
        fontWeight: "600",
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
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        backgroundColor: "#f9fafb",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    chipPrice: {
        backgroundColor: "#f97316",
        color: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginRight: 8,
        fontSize: 12,
        fontWeight: "700",
    },
    chipText: {
        fontSize: 15,
    },
    footerNote: {
        fontSize: 12,
        color: "#ef4444",
        textAlign: "center",
        marginTop: 8,
    },
    slotButton: {
        borderRadius: 999,
        backgroundColor: "#f9fafb",
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 10,
    },
    slotText: {
        fontSize: 16,
    },
    emptyText: {
        textAlign: "center",
        marginTop: 16,
        color: "#6b7280",
    },
});

export default BookAppointmentScreen;

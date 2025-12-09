// app/admin/settings/OpeningHoursSettingsSection.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL } from "@/services/api";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { CalendarList } from "react-native-calendars";

const DAY_LABELS: { key: string; label: string }[] = [
    { key: "sunday", label: "ראשון" },
    { key: "monday", label: "שני" },
    { key: "tuesday", label: "שלישי" },
    { key: "wednesday", label: "רביעי" },
    { key: "thursday", label: "חמישי" },
    { key: "friday", label: "שישי" },
    { key: "saturday", label: "שבת" },
];

// ----- BLOCKS -----
type BlockReason = "vacation" | "maintenance" | "training" | "other";
type BlockMode = "single" | "range";
type BlockTimePreset = "all_day" | "morning" | "afternoon" | "custom";

const BLOCK_REASONS: { key: BlockReason; label: string }[] = [
    { key: "vacation", label: "חופשה" },
    { key: "maintenance", label: "תחזוקה" },
    { key: "training", label: "הדרכה" },
    { key: "other", label: "אחר" },
];

type Block = {
    _id: string;
    business: string;
    resource: string | null;
    start: string; // ISO
    end: string;   // ISO
    timezone?: string;
    reason?: BlockReason;
    notes?: string | null;
    active?: boolean;
};

// יום סגור = אין שעת פתיחה *וגם* אין שעת סגירה (null או ריק)
const isDayClosed = (day: any) => !day || (!day.open && !day.close);

// מנרמל לפני שליחה לשרת – ריק => null, ואם חסר אחד הצדדים נחשב סגור
const normalizeOpeningHoursForSave = (openingHours: any) => {
    const clean: any = {};

    DAY_LABELS.forEach(({ key }) => {
        const day = openingHours?.[key] || {};
        const open = (day.open || "").trim();
        const close = (day.close || "").trim();

        if (!open || !close) {
            clean[key] = { open: null, close: null };
        } else {
            clean[key] = { open, close };
        }
    });

    return clean;
};

// helper לתאריך בפורמט YYYY-MM-DD
const dateToYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// תצוגה יפה של תאריך בעברית
const formatDateHe = (d: Date) =>
    d.toLocaleDateString("he-IL", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

const formatTimeHe = (d: Date) =>
    d.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

// ניסיון לקחת timezone מהמכשיר, ברירת מחדל לארץ
const getDeviceTimezone = () => {
    try {
        // @ts-ignore
        const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
        return tz || "Asia/Jerusalem";
    } catch {
        return "Asia/Jerusalem";
    }
};

export default function OpeningHoursSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const business = (businessData || {}) as any;
    const businessId = business?._id;

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [openingHours, setOpeningHours] = useState<any>(
        business.openingHours || {}
    );
    const [savingOpeningHours, setSavingOpeningHours] = useState(false);

    // ---- state לטופס חסימה ----
    const [blockMode, setBlockMode] = useState<BlockMode>("single");

    // מצב יום אחד:
    const [blockDate, setBlockDate] = useState(""); // YYYY-MM-DD

    // מצב טווח ימים:
    const [blockStartDate, setBlockStartDate] = useState(""); // YYYY-MM-DD
    const [blockEndDate, setBlockEndDate] = useState(""); // YYYY-MM-DD

    const [blockStartTime, setBlockStartTime] = useState(""); // HH:MM
    const [blockEndTime, setBlockEndTime] = useState(""); // HH:MM
    const [blockTimePreset, setBlockTimePreset] =
        useState<BlockTimePreset>("all_day");

    const [blockReason, setBlockReason] = useState<BlockReason>("vacation");
    const [blockNotes, setBlockNotes] = useState("");
    const [savingBlock, setSavingBlock] = useState(false);

    // מודאל בחירת תאריך + איזה שדה פעיל
    const [showBlockDateModal, setShowBlockDateModal] = useState(false);
    const [activeDateField, setActiveDateField] = useState<
        "single" | "start" | "end"
    >("single");

    // ----- רשימת חסימות קיימות -----
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

    useEffect(() => {
        setOpeningHours(business.openingHours || {});
    }, [business.openingHours]);

    // ברירת מחדל – חסימה ליום שלם
    useEffect(() => {
        applyTimePreset("all_day");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBlocks = useCallback(async () => {
        if (!userToken || !businessId) return;

        try {
            setLoadingBlocks(true);

            const res = await fetch(`${URL}/blocks/list`, {
                method: "GET",
                headers: {
                    "x-api-key": userToken || "",
                },
            });

            const text = await res.text();
            console.log(
                "📥 blocks list response:",
                res.status,
                text.substring(0, 500)
            );

            if (!res.ok) {
                return;
            }

            const data: Block[] = JSON.parse(text);
            // נוודא שמביאים רק חסימות פעילות (בכל מקרה השרת כבר מסנן כברירת מחדל)
            const activeBlocks = data.filter(
                (b) => b.active !== false
            );
            setBlocks(activeBlocks);
        } catch (err) {
            console.log("blocks list error:", err);
        } finally {
            setLoadingBlocks(false);
        }
    }, [userToken, businessId]);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    if (!businessId) {
        return null;
    }

    const handleOpeningHourChange = (
        dayKey: string,
        field: "open" | "close",
        value: string
    ) => {
        setOpeningHours((prev: any) => ({
            ...prev,
            [dayKey]: {
                ...(prev?.[dayKey] || { open: "", close: "" }),
                [field]: value,
            },
        }));
    };

    // טוגל: אם היום פתוח -> נסגור, אם סגור -> נפתח (עם שעות ברירת מחדל שאפשר לערוך)
    const handleToggleDayClosed = (dayKey: string) => {
        setOpeningHours((prev: any) => {
            const current = prev?.[dayKey];
            const closed = isDayClosed(current);

            if (closed) {
                return {
                    ...prev,
                    [dayKey]: {
                        open: current?.open || "09:00",
                        close: current?.close || "17:00",
                    },
                };
            }

            return {
                ...prev,
                [dayKey]: { open: null, close: null },
            };
        });
    };

    const handleSaveOpeningHours = async () => {
        try {
            setSavingOpeningHours(true);

            const normalized = normalizeOpeningHoursForSave(openingHours);

            const res = await fetch(
                `${URL}/businesses/${businessId}/opening-hours`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ openingHours: normalized }),
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 save openingHours response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("save openingHours error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לשמור שעות פתיחה כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "שעות הפתיחה נשמרו.");
        } catch (err) {
            console.log("save openingHours error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירת שעות הפתיחה.");
        } finally {
            setSavingOpeningHours(false);
        }
    };

    // -------- פריסטים לשעות חסימה --------
    function applyTimePreset(preset: BlockTimePreset) {
        setBlockTimePreset(preset);

        switch (preset) {
            case "all_day":
                setBlockStartTime("00:00");
                setBlockEndTime("23:59");
                break;
            case "morning":
                setBlockStartTime("09:00");
                setBlockEndTime("13:00");
                break;
            case "afternoon":
                setBlockStartTime("13:00");
                setBlockEndTime("17:00");
                break;
            case "custom":
                // לא נוגעים בשעות – המשתמש יגדיר
                break;
        }
    }

    const timePresetDescription = (() => {
        switch (blockTimePreset) {
            case "all_day":
                return "חסימה ליום שלם (00:00–23:59).";
            case "morning":
                return 'חסימת בוקר (09:00–13:00). ניתן לשנות ל"מותאם אישית" אם צריך.';
            case "afternoon":
                return 'חסימת אחר הצהריים (13:00–17:00). ניתן לשנות ל"מותאם אישית".';
            case "custom":
            default:
                return "בחר שעת התחלה ושעת סיום באופן ידני.";
        }
    })();

    // ---- יצירת חסימה ביומן (יום אחד / טווח ימים) ----
    const handleCreateBlock = async () => {
        // בדיקות לפי מצב
        if (blockMode === "single") {
            if (!blockDate || !blockStartTime || !blockEndTime) {
                Alert.alert("חסר מידע", "נא לבחור תאריך, שעת התחלה ושעת סיום.");
                return;
            }
        } else {
            if (
                !blockStartDate ||
                !blockEndDate ||
                !blockStartTime ||
                !blockEndTime
            ) {
                Alert.alert(
                    "חסר מידע",
                    "נא לבחור תאריכי התחלה/סיום ושעות תחילה/סיום."
                );
                return;
            }
        }

        // בניית start ו-end
        let start: Date;
        let end: Date;

        if (blockMode === "single") {
            start = new Date(`${blockDate}T${blockStartTime}:00`);
            end = new Date(`${blockDate}T${blockEndTime}:00`);
        } else {
            start = new Date(`${blockStartDate}T${blockStartTime}:00`);
            end = new Date(`${blockEndDate}T${blockEndTime}:00`);
        }

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            Alert.alert("שגיאה", "פורמט תאריך/שעה לא תקין.");
            return;
        }

        if (end <= start) {
            Alert.alert(
                "שגיאה",
                "שעת הסיום (ותאריך הסיום) חייבים להיות אחרי שעת/תאריך ההתחלה."
            );
            return;
        }

        try {
            setSavingBlock(true);

            const payload = {
                // business מגיע מה-token בשרת
                resource: null, // חסימה לכל העסק
                start: start.toISOString(),
                end: end.toISOString(),
                timezone: getDeviceTimezone(),
                reason: blockReason,
                notes: blockNotes || null,
            };

            const res = await fetch(`${URL}/blocks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": userToken || "",
                },
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            console.log("📥 create block response:", res.status, text);

            if (!res.ok) {
                Alert.alert("שגיאה", "לא ניתן ליצור חסימה ביומן כרגע.");
                return;
            }

            Alert.alert(
                "הצלחה",
                blockMode === "single"
                    ? "נוספה חסימה ליום שנבחר."
                    : "נוספה חסימה לטווח התאריכים שנבחר."
            );

            // איפוס טופס
            setBlockDate("");
            setBlockStartDate("");
            setBlockEndDate("");
            setBlockStartTime("");
            setBlockEndTime("");
            setBlockTimePreset("all_day");
            setBlockReason("vacation");
            setBlockNotes("");

            // להחזיר שוב ליום שלם כברירת מחדל
            applyTimePreset("all_day");

            // ריענון רשימת החסימות
            fetchBlocks();
        } catch (err) {
            console.log("create block error:", err);
            Alert.alert("שגיאה", "אירעה תקלה ביצירת החסימה.");
        } finally {
            setSavingBlock(false);
        }
    };

    const handleDeleteBlock = (blockId: string) => {
        Alert.alert(
            "מחיקת חסימה",
            "האם אתה בטוח שברצונך למחוק את החסימה הזו?",
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "מחיקה",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setDeletingBlockId(blockId);

                            const res = await fetch(`${URL}/blocks/${blockId}`, {
                                method: "DELETE",
                                headers: {
                                    "x-api-key": userToken || "",
                                },
                            });

                            const text = await res.text();
                            console.log(
                                "🗑 delete block response:",
                                res.status,
                                text
                            );

                            if (!res.ok) {
                                Alert.alert(
                                    "שגיאה",
                                    "לא ניתן למחוק את החסימה כרגע."
                                );
                                return;
                            }

                            // מסירים מהסטייט בלי לחכות ל-fetch נוסף
                            setBlocks((prev) =>
                                prev.filter((b) => b._id !== blockId)
                            );
                        } catch (err) {
                            console.log("delete block error:", err);
                            Alert.alert(
                                "שגיאה",
                                "אירעה תקלה במחיקת החסימה."
                            );
                        } finally {
                            setDeletingBlockId(null);
                        }
                    },
                },
            ]
        );
    };

    // טקסטים יפים לכפתורי תאריכים
    const blockDateLabel = blockDate
        ? formatDateHe(new Date(blockDate))
        : "בחר תאריך";
    const blockStartDateLabel = blockStartDate
        ? formatDateHe(new Date(blockStartDate))
        : "מתאריך";
    const blockEndDateLabel = blockEndDate
        ? formatDateHe(new Date(blockEndDate))
        : "עד תאריך";

    const timeInputsDisabled = blockTimePreset !== "custom";

    const formatBlockRange = (block: Block) => {
        const start = new Date(block.start);
        const end = new Date(block.end);
        const sameDay = dateToYMD(start) === dateToYMD(end);

        if (sameDay) {
            return `${formatDateHe(start)} · ${formatTimeHe(
                start
            )}–${formatTimeHe(end)}`;
        }
        return `${formatDateHe(start)} – ${formatDateHe(end)}`;
    };

    const getReasonLabel = (reason?: BlockReason) => {
        if (!reason) return "חסימה ביומן";
        return (
            BLOCK_REASONS.find((r) => r.key === reason)?.label ||
            "חסימה ביומן"
        );
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>שעות פתיחה</Text>
            <Text style={styles.cardSubtitleHighlight}>
                רוצה לצאת לחופשה? לסגור חצי יום לטובת פגישת עסקים? בתחתית
                העמוד אפשר להוסיף חסימה ביומן (ליום אחד או לטווח של כמה ימים).
            </Text>

            {/* ==== טבלת שעות פתיחה ==== */}
            <View style={{ marginTop: 8, gap: 8 }}>
                {DAY_LABELS.map(({ key, label }) => {
                    const dayObj = openingHours?.[key] || {
                        open: "",
                        close: "",
                    };
                    const closed = isDayClosed(dayObj);

                    return (
                        <View key={key} style={styles.openingRow}>
                            <Text style={styles.openingDayLabel}>{label}</Text>

                            <View style={styles.openingInputs}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardSubtitle}>
                                        פתיחה
                                    </Text>
                                    <TextInput
                                        value={dayObj.open ?? ""}
                                        onChangeText={(val) =>
                                            handleOpeningHourChange(
                                                key,
                                                "open",
                                                val
                                            )
                                        }
                                        placeholder="09:00"
                                        style={[
                                            styles.inputSmall,
                                            closed && { opacity: 0.5 },
                                        ]}
                                        editable={!closed}
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardSubtitle}>
                                        סגירה
                                    </Text>
                                    <TextInput
                                        value={dayObj.close ?? ""}
                                        onChangeText={(val) =>
                                            handleOpeningHourChange(
                                                key,
                                                "close",
                                                val
                                            )
                                        }
                                        placeholder="17:00"
                                        style={[
                                            styles.inputSmall,
                                            closed && { opacity: 0.5 },
                                        ]}
                                        editable={!closed}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.closeDayButton,
                                    closed && styles.closeDayButtonActive,
                                ]}
                                onPress={() => handleToggleDayClosed(key)}
                            >
                                <Text
                                    style={[
                                        styles.closeDayButtonText,
                                        closed &&
                                        styles.closeDayButtonTextActive,
                                    ]}
                                >
                                    {closed ? "יום סגור" : "סגור יום"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { backgroundColor: colorsSafe.primary, marginTop: 12 },
                ]}
                onPress={handleSaveOpeningHours}
                disabled={savingOpeningHours}
            >
                {savingOpeningHours ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.actionButtonText}>
                        שמירת שעות פתיחה
                    </Text>
                )}
            </TouchableOpacity>

            {/* ==== חסימות ביומן ==== */}
            <View style={styles.blockSection}>
                <Text style={styles.blockTitle}>חסימות ביומן</Text>
                <Text style={styles.cardSubtitle}>
                    כאן אפשר לסגור את היומן ליום/חצי יום או לטווח של כמה ימים
                    לטובת חופשה, פגישות או תחזוקה.
                </Text>

                {/* מצב חסימה: יום אחד / טווח ימים */}
                <View style={styles.modeRow}>
                    <TouchableOpacity
                        style={[
                            styles.modeChip,
                            blockMode === "single" && styles.modeChipActive,
                        ]}
                        onPress={() => setBlockMode("single")}
                    >
                        <Text
                            style={[
                                styles.modeChipText,
                                blockMode === "single" &&
                                styles.modeChipTextActive,
                            ]}
                        >
                            חסימה ליום אחד
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeChip,
                            blockMode === "range" && styles.modeChipActive,
                        ]}
                        onPress={() => setBlockMode("range")}
                    >
                        <Text
                            style={[
                                styles.modeChipText,
                                blockMode === "range" &&
                                styles.modeChipTextActive,
                            ]}
                        >
                            חסימה לטווח ימים
                        </Text>
                    </TouchableOpacity>
                </View>

                {blockMode === "single" ? (
                    // ===== מצב יום אחד =====
                    <View style={styles.blockRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardSubtitle}>תאריך</Text>
                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => {
                                    setActiveDateField("single");
                                    setShowBlockDateModal(true);
                                }}
                            >
                                <Text style={styles.datePickerButtonText}>
                                    {blockDateLabel}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.datePickerHint}>
                                בחר תאריך בודד לחסימה.
                            </Text>
                        </View>
                    </View>
                ) : (
                    // ===== מצב טווח ימים =====
                    <>
                        <View style={styles.blockRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardSubtitle}>
                                    מתאריך
                                </Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        setActiveDateField("start");
                                        setShowBlockDateModal(true);
                                    }}
                                >
                                    <Text style={styles.datePickerButtonText}>
                                        {blockStartDateLabel}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardSubtitle}>
                                    עד תאריך
                                </Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        setActiveDateField("end");
                                        setShowBlockDateModal(true);
                                    }}
                                >
                                    <Text style={styles.datePickerButtonText}>
                                        {blockEndDateLabel}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.datePickerHint}>
                            לדוגמה: חופשה מ־01.08 עד 07.08.
                        </Text>
                    </>
                )}

                {/* ===== פריסטים לשעות ===== */}
                <Text style={[styles.cardSubtitle, { marginTop: 10 }]}>
                    שעות חסימה
                </Text>
                <View style={styles.timePresetRow}>
                    <TouchableOpacity
                        style={[
                            styles.timePresetChip,
                            blockTimePreset === "all_day" &&
                            styles.timePresetChipActive,
                        ]}
                        onPress={() => applyTimePreset("all_day")}
                    >
                        <Text
                            style={[
                                styles.timePresetText,
                                blockTimePreset === "all_day" &&
                                styles.timePresetTextActive,
                            ]}
                        >
                            יום שלם
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.timePresetChip,
                            blockTimePreset === "morning" &&
                            styles.timePresetChipActive,
                        ]}
                        onPress={() => applyTimePreset("morning")}
                    >
                        <Text
                            style={[
                                styles.timePresetText,
                                blockTimePreset === "morning" &&
                                styles.timePresetTextActive,
                            ]}
                        >
                            בוקר
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.timePresetChip,
                            blockTimePreset === "afternoon" &&
                            styles.timePresetChipActive,
                        ]}
                        onPress={() => applyTimePreset("afternoon")}
                    >
                        <Text
                            style={[
                                styles.timePresetText,
                                blockTimePreset === "afternoon" &&
                                styles.timePresetTextActive,
                            ]}
                        >
                            אחה"צ
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.timePresetChip,
                            blockTimePreset === "custom" &&
                            styles.timePresetChipActive,
                        ]}
                        onPress={() => applyTimePreset("custom")}
                    >
                        <Text
                            style={[
                                styles.timePresetText,
                                blockTimePreset === "custom" &&
                                styles.timePresetTextActive,
                            ]}
                        >
                            מותאם אישית
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.datePickerHint}>{timePresetDescription}</Text>

                {/* אינפוטים לשעה (ננעלים לפי פריסט) */}
                <View style={styles.blockRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardSubtitle}>שעת התחלה</Text>
                        <TextInput
                            value={blockStartTime}
                            onChangeText={setBlockStartTime}
                            placeholder="09:00"
                            style={[
                                styles.inputSmall,
                                timeInputsDisabled && { opacity: 0.5 },
                            ]}
                            editable={!timeInputsDisabled}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardSubtitle}>שעת סיום</Text>
                        <TextInput
                            value={blockEndTime}
                            onChangeText={setBlockEndTime}
                            placeholder="13:00"
                            style={[
                                styles.inputSmall,
                                timeInputsDisabled && { opacity: 0.5 },
                            ]}
                            editable={!timeInputsDisabled}
                        />
                    </View>
                </View>

                <Text style={styles.cardSubtitle}>סיבה</Text>
                <View style={styles.reasonRow}>
                    {BLOCK_REASONS.map((r) => {
                        const active = blockReason === r.key;
                        return (
                            <TouchableOpacity
                                key={r.key}
                                style={[
                                    styles.reasonChip,
                                    active && styles.reasonChipActive,
                                ]}
                                onPress={() => setBlockReason(r.key)}
                            >
                                <Text
                                    style={[
                                        styles.reasonChipText,
                                        active && styles.reasonChipTextActive,
                                    ]}
                                >
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.cardSubtitle}>הערה (לא חובה)</Text>
                <TextInput
                    value={blockNotes}
                    onChangeText={setBlockNotes}
                    placeholder="לדוגמה: חופשת סוכות / יום צילום למיתוג..."
                    style={[styles.inputSmall, { textAlign: "right" }]}
                    multiline
                />

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: colorsSafe.third,
                            marginTop: 10,
                        },
                    ]}
                    onPress={handleCreateBlock}
                    disabled={savingBlock}
                >
                    {savingBlock ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            הוספת חסימה ביומן
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ===== רשימת חסימות קיימות ===== */}
                <View style={styles.blockListContainer}>
                    <Text style={styles.blockListTitle}>
                        חסימות פעילות
                    </Text>

                    {loadingBlocks ? (
                        <ActivityIndicator style={{ marginTop: 8 }} />
                    ) : blocks.length === 0 ? (
                        <Text style={styles.blockEmptyText}>
                            אין חסימות פעילות כרגע.
                        </Text>
                    ) : (
                        blocks.map((block) => (
                            <View
                                key={block._id}
                                style={styles.blockItem}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.blockItemTitle}>
                                        {formatBlockRange(block)}
                                    </Text>
                                    <Text style={styles.blockItemSubtitle}>
                                        {getReasonLabel(block.reason)}
                                        {block.notes
                                            ? ` · ${block.notes}`
                                            : ""}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.blockDeleteButton}
                                    onPress={() =>
                                        handleDeleteBlock(block._id)
                                    }
                                    disabled={
                                        deletingBlockId === block._id
                                    }
                                >
                                    {deletingBlockId ===
                                        block._id ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#b91c1c"
                                        />
                                    ) : (
                                        <Text
                                            style={
                                                styles.blockDeleteButtonText
                                            }
                                        >
                                            מחיקה
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </View>

            {/* מודאל בחירת תאריך לחסימה (יום או טווח) */}
            <Modal
                visible={showBlockDateModal}
                transparent
                animationType="slide"
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {blockMode === "single"
                                ? "בחר תאריך לחסימה"
                                : activeDateField === "start"
                                    ? "בחר תאריך התחלה"
                                    : "בחר תאריך סיום"}
                        </Text>

                        <CalendarList
                            minDate={dateToYMD(new Date())}
                            futureScrollRange={12}
                            onDayPress={(day) => {
                                if (activeDateField === "single") {
                                    setBlockDate(day.dateString);
                                } else if (activeDateField === "start") {
                                    setBlockStartDate(day.dateString);
                                    if (!blockEndDate) {
                                        setBlockEndDate(
                                            day.dateString
                                        );
                                    }
                                } else {
                                    setBlockEndDate(day.dateString);
                                }
                                setShowBlockDateModal(false);
                            }}
                        />

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowBlockDateModal(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>
                                סגור
                            </Text>
                        </TouchableOpacity>
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
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
    },
    cardSubtitleHighlight: {
        fontSize: 13,
        color: "#4b5563",
        marginTop: 4,
        fontWeight: "500",
    },
    openingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    openingDayLabel: {
        width: 60,
        fontSize: 14,
        fontWeight: "500",
    },
    openingInputs: {
        flex: 1,
        flexDirection: "row",
        gap: 8,
    },
    inputSmall: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        backgroundColor: "#f9fafb",
        textAlign: "center",
    },
    closeDayButton: {
        marginLeft: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
        borderWidth: 1,
        borderColor: "#d1d5db",
    },
    closeDayButtonActive: {
        backgroundColor: "#fee2e2",
        borderColor: "#ef4444",
    },
    closeDayButtonText: {
        fontSize: 12,
        color: "#374151",
        fontWeight: "500",
    },
    closeDayButtonTextActive: {
        color: "#b91c1c",
        fontWeight: "600",
    },
    actionButton: {
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },

    // ===== חסימות =====
    blockSection: {
        marginTop: 18,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        gap: 8,
    },
    blockTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
        textAlign: "right",
    },
    blockRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    reasonRow: {
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 4,
        marginBottom: 4,
    },
    reasonChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#f9fafb",
    },
    reasonChipActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    reasonChipText: {
        fontSize: 12,
        color: "#374151",
    },
    reasonChipTextActive: {
        color: "#ffffff",
        fontWeight: "600",
    },

    // ===== מצב חסימה =====
    modeRow: {
        flexDirection: "row-reverse",
        gap: 8,
        marginTop: 6,
        marginBottom: 4,
    },
    modeChip: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#f9fafb",
        alignItems: "center",
        justifyContent: "center",
    },
    modeChipActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    modeChipText: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "500",
    },
    modeChipTextActive: {
        color: "#ffffff",
        fontWeight: "600",
    },

    // ===== בחירת תאריך =====
    datePickerButton: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#f9fafb",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
    },
    datePickerButtonText: {
        fontSize: 13,
        color: "#111827",
    },
    datePickerHint: {
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 2,
        textAlign: "right",
    },

    // ===== פריסטי שעות =====
    timePresetRow: {
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
        marginBottom: 4,
    },
    timePresetChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#d1d5db",
        backgroundColor: "#f9fafb",
    },
    timePresetChipActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    timePresetText: {
        fontSize: 12,
        color: "#374151",
    },
    timePresetTextActive: {
        color: "#ffffff",
        fontWeight: "600",
    },

    // ===== רשימת חסימות =====
    blockListContainer: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
        gap: 8,
    },
    blockListTitle: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "right",
        marginBottom: 4,
    },
    blockEmptyText: {
        fontSize: 12,
        color: "#9ca3af",
        textAlign: "right",
        marginTop: 4,
    },
    blockItem: {
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        gap: 8,
    },
    blockItemTitle: {
        fontSize: 13,
        fontWeight: "600",
        textAlign: "right",
    },
    blockItemSubtitle: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
        textAlign: "right",
    },
    blockDeleteButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#b91c1c",
        backgroundColor: "#fee2e2",
    },
    blockDeleteButtonText: {
        fontSize: 12,
        color: "#b91c1c",
        fontWeight: "600",
    },

    // ===== מודאל תאריך =====
    modalBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    modalCard: {
        backgroundColor: "#fff",
        padding: 16,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
        textAlign: "center",
    },
    modalCloseButton: {
        marginTop: 8,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1d4ed8",
        backgroundColor: "#eef2ff",
    },
    modalCloseButtonText: {
        fontSize: 13,
        color: "#1d4ed8",
        fontWeight: "600",
    },
});

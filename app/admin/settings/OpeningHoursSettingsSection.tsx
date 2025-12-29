// app/admin/settings/OpeningHoursSettingsSection.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { CalendarList, DateData } from "react-native-calendars";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiDelete, apiFetch, apiPatch, apiPost } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type BlockReason = "vacation" | "maintenance" | "training" | "other";
type BlockMode = "single" | "range";
type BlockTimePreset = "all_day" | "morning" | "afternoon" | "custom";

const DAY_LABELS = [
    { key: "sunday", label: "ראשון" },
    { key: "monday", label: "שני" },
    { key: "tuesday", label: "שלישי" },
    { key: "wednesday", label: "רביעי" },
    { key: "thursday", label: "חמישי" },
    { key: "friday", label: "שישי" },
    { key: "saturday", label: "שבת" },
] as const;

const BLOCK_REASONS: { key: BlockReason; label: string }[] = [
    { key: "vacation", label: "חופשה" },
    { key: "maintenance", label: "תחזוקה" },
    { key: "training", label: "הדרכה" },
    { key: "other", label: "אחר" },
];

interface Block {
    _id: string;
    business: string;
    resource: string | null; // null = כל העסק, string = workerId
    start: string;
    end: string;
    timezone?: string;
    reason?: BlockReason;
    notes?: string | null;
    active?: boolean;
}

interface WorkerOption {
    id: string;
    name: string;
}

interface OpeningHoursDay {
    open: string | null;
    close: string | null;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const isDayClosed = (day?: OpeningHoursDay) => !day || (!day.open && !day.close);

const normalizeOpeningHoursForSave = (openingHours: any) => {
    const clean: Record<string, OpeningHoursDay> = {};
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

const dateToYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

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

const getDeviceTimezone = () => {
    try {
        return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || "Asia/Jerusalem";
    } catch {
        return "Asia/Jerusalem";
    }
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function OpeningHoursSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth(); // for dependency arrays

    const business = (businessData || {}) as any;
    const businessId = business?._id;

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    // --- State: Opening Hours ---
    const [openingHours, setOpeningHours] = useState<any>(business.openingHours || {});
    const [savingOpeningHours, setSavingOpeningHours] = useState(false);

    // --- State: Blocks Form ---
    const [blockMode, setBlockMode] = useState<BlockMode>("single");
    const [selectedBlockResource, setSelectedBlockResource] = useState<string | null>(null);

    const [blockDate, setBlockDate] = useState("");
    const [blockStartDate, setBlockStartDate] = useState("");
    const [blockEndDate, setBlockEndDate] = useState("");

    const [blockStartTime, setBlockStartTime] = useState("");
    const [blockEndTime, setBlockEndTime] = useState("");
    const [blockTimePreset, setBlockTimePreset] = useState<BlockTimePreset>("all_day");

    const [blockReason, setBlockReason] = useState<BlockReason>("vacation");
    const [blockNotes, setBlockNotes] = useState("");
    const [savingBlock, setSavingBlock] = useState(false);

    // --- State: Modals & Lists ---
    const [showBlockDateModal, setShowBlockDateModal] = useState(false);
    const [activeDateField, setActiveDateField] = useState<"single" | "start" | "end">("single");

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

    // --- Computed ---
    const workerOptions: WorkerOption[] = useMemo(() => {
        const arr: WorkerOption[] = [];
        if (business?.workers?.length) {
            business.workers.forEach((w: any) => {
                arr.push({ id: w._id, name: w.name || w.fullName || "עובד" });
            });
        }
        if (business?.owner?._id) {
            const exists = arr.some((x) => x.id === business.owner._id);
            if (!exists) arr.unshift({ id: business.owner._id, name: business.owner.name || "בעל העסק" });
        }
        return arr;
    }, [business]);

    const timePresetDescription = useMemo(() => {
        switch (blockTimePreset) {
            case "all_day": return "חסימה ליום שלם (00:00–23:59).";
            case "morning": return "חסימת בוקר (09:00–13:00).";
            case "afternoon": return "חסימת אחר הצהריים (13:00–17:00).";
            default: return "בחר שעת התחלה וסיום ידנית.";
        }
    }, [blockTimePreset]);

    // --- Effects ---

    useEffect(() => {
        setOpeningHours(business.openingHours || {});
    }, [business.openingHours]);

    useEffect(() => {
        applyTimePreset("all_day");
    }, []);

    const fetchBlocks = useCallback(async () => {
        if (!businessId) return;
        setLoadingBlocks(true);
        try {
            const res = await apiFetch("/blocks/list");
            if (res.ok) {
                const data: Block[] = await res.json();
                setBlocks(data.filter((b) => b.active !== false));
            }
        } catch (err) {
            console.error("fetchBlocks error:", err);
        } finally {
            setLoadingBlocks(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    if (!businessId) return null;

    // --- Handlers: Opening Hours ---

    const handleOpeningHourChange = (dayKey: string, field: "open" | "close", value: string) => {
        setOpeningHours((prev: any) => ({
            ...prev,
            [dayKey]: {
                ...(prev?.[dayKey] || { open: "", close: "" }),
                [field]: value,
            },
        }));
    };

    const handleToggleDayClosed = (dayKey: string) => {
        setOpeningHours((prev: any) => {
            const current = prev?.[dayKey];
            const closed = isDayClosed(current);

            if (closed) {
                // Open with defaults
                return {
                    ...prev,
                    [dayKey]: { open: current?.open || "09:00", close: current?.close || "17:00" },
                };
            }
            // Close
            return { ...prev, [dayKey]: { open: null, close: null } };
        });
    };

    const handleSaveOpeningHours = async () => {
        try {
            setSavingOpeningHours(true);
            const normalized = normalizeOpeningHoursForSave(openingHours);

            await apiPatch(`/businesses/${businessId}/opening-hours`, { openingHours: normalized });

            await refetch();
            Alert.alert("הצלחה", "שעות הפתיחה נשמרו.");
        } catch (err) {
            console.error("Save opening hours error:", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירה.");
        } finally {
            setSavingOpeningHours(false);
        }
    };

    // --- Handlers: Blocks ---

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
                break;
        }
    }

    const handleCreateBlock = async () => {
        // Validations
        if (blockMode === "single") {
            if (!blockDate || !blockStartTime || !blockEndTime) {
                return Alert.alert("חסר מידע", "נא להשלים את כל השדות.");
            }
        } else {
            if (!blockStartDate || !blockEndDate || !blockStartTime || !blockEndTime) {
                return Alert.alert("חסר מידע", "נא להשלים את כל השדות.");
            }
        }

        let start: Date, end: Date;
        if (blockMode === "single") {
            start = new Date(`${blockDate}T${blockStartTime}:00`);
            end = new Date(`${blockDate}T${blockEndTime}:00`);
        } else {
            start = new Date(`${blockStartDate}T${blockStartTime}:00`);
            end = new Date(`${blockEndDate}T${blockEndTime}:00`);
        }

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return Alert.alert("שגיאה", "תאריך או שעה לא תקינים.");
        }
        if (end <= start) {
            return Alert.alert("שגיאה", "זמן הסיום חייב להיות אחרי ההתחלה.");
        }

        try {
            setSavingBlock(true);
            const payload = {
                resource: selectedBlockResource,
                start: start.toISOString(),
                end: end.toISOString(),
                timezone: getDeviceTimezone(),
                reason: blockReason,
                notes: blockNotes || null,
            };

            await apiPost("/blocks", payload);

            Alert.alert("הצלחה", "החסימה נוצרה בהצלחה.");

            // Reset
            setBlockDate("");
            setBlockStartDate("");
            setBlockEndDate("");
            setBlockNotes("");
            applyTimePreset("all_day");

            fetchBlocks();

        } catch (err) {
            console.error("Create block error:", err);
            Alert.alert("שגיאה", "תקלה ביצירת החסימה.");
        } finally {
            setSavingBlock(false);
        }
    };

    const handleDeleteBlock = (blockId: string) => {
        Alert.alert("מחיקת חסימה", "למחוק חסימה זו?", [
            { text: "ביטול", style: "cancel" },
            {
                text: "מחק",
                style: "destructive",
                onPress: async () => {
                    try {
                        setDeletingBlockId(blockId);
                        await apiDelete(`/blocks/${blockId}`);
                        setBlocks(prev => prev.filter(b => b._id !== blockId));
                    } catch (err) {
                        Alert.alert("שגיאה", "לא ניתן למחוק.");
                    } finally {
                        setDeletingBlockId(null);
                    }
                }
            }
        ]);
    };

    // --- Render Helpers ---

    const blockDateLabel = blockDate ? formatDateHe(new Date(blockDate)) : "בחר תאריך";
    const blockStartLabel = blockStartDate ? formatDateHe(new Date(blockStartDate)) : "מתאריך";
    const blockEndLabel = blockEndDate ? formatDateHe(new Date(blockEndDate)) : "עד תאריך";
    const timeDisabled = blockTimePreset !== "custom";

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>שעות פתיחה</Text>
            <Text style={styles.cardSubtitleHighlight}>
                נהל את שעות הפעילות הקבועות ואת החסימות ביומן (חופשות וחגים).
            </Text>

            {/* --- Opening Hours Table --- */}
            <View style={{ marginTop: 12, gap: 10 }}>
                {DAY_LABELS.map(({ key, label }) => {
                    const dayObj = openingHours?.[key] || { open: "", close: "" };
                    const closed = isDayClosed(dayObj);

                    return (
                        <View key={key} style={styles.openingRow}>
                            <Text style={styles.openingDayLabel}>{label}</Text>

                            <View style={styles.openingInputs}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>פתיחה</Text>
                                    <TextInput
                                        value={dayObj.open ?? ""}
                                        onChangeText={val => handleOpeningHourChange(key, "open", val)}
                                        placeholder="09:00"
                                        style={[styles.inputSmall, closed && { opacity: 0.5 }]}
                                        editable={!closed}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>סגירה</Text>
                                    <TextInput
                                        value={dayObj.close ?? ""}
                                        onChangeText={val => handleOpeningHourChange(key, "close", val)}
                                        placeholder="17:00"
                                        style={[styles.inputSmall, closed && { opacity: 0.5 }]}
                                        editable={!closed}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.closeDayButton, closed && styles.closeDayButtonActive]}
                                onPress={() => handleToggleDayClosed(key)}
                            >
                                <Text style={[styles.closeDayButtonText, closed && styles.closeDayButtonTextActive]}>
                                    {closed ? "סגור" : "פעיל"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colorsSafe.primary, marginTop: 16 }]}
                onPress={handleSaveOpeningHours}
                disabled={savingOpeningHours}
            >
                {savingOpeningHours ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>שמירה</Text>}
            </TouchableOpacity>

            {/* --- Blocks Section --- */}
            <View style={styles.blockSection}>
                <Text style={styles.blockTitle}>חסימות ביומן</Text>

                {/* Resource Select */}
                <Text style={styles.label}>עבור מי?</Text>
                <View style={styles.chipRow}>
                    <TouchableOpacity
                        style={[styles.chip, selectedBlockResource === null && styles.chipActive]}
                        onPress={() => setSelectedBlockResource(null)}
                    >
                        <Text style={[styles.chipText, selectedBlockResource === null && styles.chipTextActive]}>כל העסק</Text>
                    </TouchableOpacity>
                    {workerOptions.map(w => (
                        <TouchableOpacity
                            key={w.id}
                            style={[styles.chip, selectedBlockResource === w.id && styles.chipActive]}
                            onPress={() => setSelectedBlockResource(w.id)}
                        >
                            <Text style={[styles.chipText, selectedBlockResource === w.id && styles.chipTextActive]}>{w.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Mode Select */}
                <View style={styles.chipRow}>
                    <TouchableOpacity style={[styles.modeChip, blockMode === "single" && styles.chipActive]} onPress={() => setBlockMode("single")}>
                        <Text style={[styles.chipText, blockMode === "single" && styles.chipTextActive]}>יום אחד</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modeChip, blockMode === "range" && styles.chipActive]} onPress={() => setBlockMode("range")}>
                        <Text style={[styles.chipText, blockMode === "range" && styles.chipTextActive]}>טווח תאריכים</Text>
                    </TouchableOpacity>
                </View>

                {/* Date Pickers */}
                {blockMode === "single" ? (
                    <TouchableOpacity style={styles.datePicker} onPress={() => { setActiveDateField("single"); setShowBlockDateModal(true); }}>
                        <Text>{blockDateLabel}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.datePicker, { flex: 1 }]} onPress={() => { setActiveDateField("start"); setShowBlockDateModal(true); }}>
                            <Text>{blockStartLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.datePicker, { flex: 1 }]} onPress={() => { setActiveDateField("end"); setShowBlockDateModal(true); }}>
                            <Text>{blockEndLabel}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Time Presets */}
                <Text style={[styles.label, { marginTop: 10 }]}>שעות</Text>
                <View style={styles.chipRow}>
                    {['all_day', 'morning', 'afternoon', 'custom'].map((p: any) => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.chip, blockTimePreset === p && styles.chipActive]}
                            onPress={() => applyTimePreset(p)}
                        >
                            <Text style={[styles.chipText, blockTimePreset === p && styles.chipTextActive]}>
                                {p === 'all_day' ? 'יום שלם' : p === 'morning' ? 'בוקר' : p === 'afternoon' ? 'צהריים' : 'ידני'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>{timePresetDescription}</Text>

                {/* Manual Time Input */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                        value={blockStartTime} onChangeText={setBlockStartTime}
                        style={[styles.inputSmall, { flex: 1 }, timeDisabled && { opacity: 0.5 }]}
                        editable={!timeDisabled}
                        placeholder="09:00"
                    />
                    <TextInput
                        value={blockEndTime} onChangeText={setBlockEndTime}
                        style={[styles.inputSmall, { flex: 1 }, timeDisabled && { opacity: 0.5 }]}
                        editable={!timeDisabled}
                        placeholder="17:00"
                    />
                </View>

                {/* Reason & Notes */}
                <Text style={[styles.label, { marginTop: 10 }]}>סיבה</Text>
                <View style={styles.chipRow}>
                    {BLOCK_REASONS.map(r => (
                        <TouchableOpacity key={r.key} style={[styles.chip, blockReason === r.key && styles.chipActive]} onPress={() => setBlockReason(r.key)}>
                            <Text style={[styles.chipText, blockReason === r.key && styles.chipTextActive]}>{r.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    value={blockNotes} onChangeText={setBlockNotes}
                    placeholder="הערה (אופציונלי)"
                    style={[styles.inputSmall, { textAlign: 'right', marginTop: 10 }]}
                />

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colorsSafe.third, marginTop: 16 }]}
                    onPress={handleCreateBlock}
                    disabled={savingBlock}
                >
                    {savingBlock ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>הוסף חסימה</Text>}
                </TouchableOpacity>

                {/* Blocks List */}
                <View style={styles.blockList}>
                    <Text style={styles.blockListTitle}>חסימות פעילות</Text>
                    {loadingBlocks ? <ActivityIndicator /> : blocks.length === 0 ? (
                        <Text style={styles.emptyText}>אין חסימות פעילות.</Text>
                    ) : (
                        blocks.map(b => (
                            <View key={b._id} style={styles.blockItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.blockTitleText}>
                                        {new Date(b.start).toLocaleDateString('he-IL')} - {new Date(b.end).toLocaleDateString('he-IL')}
                                    </Text>
                                    <Text style={styles.blockSubText}>
                                        {BLOCK_REASONS.find(r => r.key === b.reason)?.label} • {b.resource ? "עובד ספציפי" : "כל העסק"}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteBlock(b._id)} style={styles.deleteBtn}>
                                    {deletingBlockId === b._id ? <ActivityIndicator size="small" color="red" /> : <Text style={styles.deleteBtnText}>מחק</Text>}
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

            </View>

            {/* Date Modal */}
            <Modal visible={showBlockDateModal} transparent animationType="slide" onRequestClose={() => setShowBlockDateModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <CalendarList
                            onDayPress={(day: DateData) => {
                                if (activeDateField === 'single') setBlockDate(day.dateString);
                                else if (activeDateField === 'start') setBlockStartDate(day.dateString);
                                else setBlockEndDate(day.dateString);
                                setShowBlockDateModal(false);
                            }}
                            pastScrollRange={0}
                            futureScrollRange={12}
                        />
                        <TouchableOpacity onPress={() => setShowBlockDateModal(false)} style={styles.closeModalBtn}>
                            <Text>סגור</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: "700", textAlign: "right", marginBottom: 4 },
    cardSubtitleHighlight: { fontSize: 13, color: "#4b5563", textAlign: "right", marginBottom: 12 },

    // Opening Hours
    openingRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    openingDayLabel: { width: 50, textAlign: "right", fontWeight: "600" },
    openingInputs: { flexDirection: "row", gap: 8, flex: 1, marginHorizontal: 8 },
    inputLabel: { fontSize: 10, textAlign: "center", color: "#6b7280", marginBottom: 2 },
    inputSmall: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 8, textAlign: "center", backgroundColor: "#f9fafb" },

    closeDayButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
    closeDayButtonActive: { backgroundColor: "#fee2e2" },
    closeDayButtonText: { fontSize: 12, fontWeight: "600", color: "#374151" },
    closeDayButtonTextActive: { color: "#b91c1c" },

    actionButton: { padding: 12, borderRadius: 99, alignItems: "center" },
    actionButtonText: { color: "#fff", fontWeight: "700" },

    // Blocks
    blockSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
    blockTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 12 },
    label: { fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: 6, color: "#374151" },
    hint: { fontSize: 11, color: "#9ca3af", textAlign: "right", marginBottom: 8 },

    chipRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
    chipActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
    chipText: { fontSize: 12, color: "#374151" },
    chipTextActive: { color: "#fff", fontWeight: "600" },

    modeChip: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },

    datePicker: { padding: 10, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, alignItems: "center", backgroundColor: "#f9fafb", marginBottom: 12 },

    // List
    blockList: { marginTop: 20 },
    blockListTitle: { fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 8 },
    emptyText: { textAlign: "right", color: "#9ca3af", fontStyle: "italic" },
    blockItem: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#f9fafb", borderRadius: 10, marginBottom: 8 },
    blockTitleText: { fontWeight: "600", textAlign: "right" },
    blockSubText: { fontSize: 12, color: "#6b7280", textAlign: "right" },
    deleteBtn: { padding: 8 },
    deleteBtnText: { color: "red", fontSize: 12, fontWeight: "600" },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, height: "70%" },
    closeModalBtn: { alignSelf: "center", padding: 10, marginTop: 10 },
});
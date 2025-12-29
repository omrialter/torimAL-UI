// components/QuickBookButton.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useBusinessDataContext } from '../contexts/BusinessDataContext';
import { apiGet } from '../services/api';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface Worker {
    _id: string;
    name: string;
    avatarUrl?: string;
}

interface Service {
    _id: string;
    name: string;
    duration: number;
    price?: number;
}

interface SlotResponse {
    slots: string[]; // ISO strings
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export const QuickBookButton = () => {
    const router = useRouter();
    const { userToken } = useAuth();
    const { businessData, colors } = useBusinessDataContext();

    // המרה בטוחה
    const business = (businessData || {}) as any;

    // בניית רשימת המטפלים (עובדים או בעל העסק)
    const workers: Worker[] = useMemo(() => {
        const definedWorkers = (business?.workers || []) as Worker[];

        // אם יש עובדים מוגדרים, נשתמש בהם
        if (definedWorkers.length > 0) {
            return definedWorkers;
        }

        // אם אין עובדים, נשתמש בבעל העסק (Owner)
        if (business?.owner) {
            // בדיקה האם owner הוא אובייקט (populated) או סתם ID (string)
            const isOwnerObject = typeof business.owner === 'object';
            const ownerId = isOwnerObject ? business.owner._id : business.owner;

            // שם המטפל: אם יש שם ל-owner נשתמש בו, אחרת נשתמש בשם העסק
            const ownerName = isOwnerObject
                ? (business.owner.name || business.owner.fullName || business.name)
                : business.name || "בעל העסק";

            return [{
                _id: ownerId,
                name: ownerName,
                avatarUrl: isOwnerObject ? business.owner.avatarUrl : undefined
            }];
        }

        return [];
    }, [business]);

    const services = (business?.services || []) as Service[];

    const theme = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    // State
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<'form' | 'results'>('form');
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<string[]>([]);

    // Selection
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // בחירה אוטומטית: אם יש רק מטפל אחד (או רק הבעלים), נבחר אותו מיד
    useEffect(() => {
        if (visible && step === 'form') {
            if (workers.length === 1 && !selectedWorker) {
                setSelectedWorker(workers[0]);
            }
        }
    }, [visible, step, workers]); // הסרתי את services מהתלות כדי למנוע ריצות כפולות מיותרות

    const handleOpen = () => {
        if (!userToken) {
            Alert.alert("התחברות נדרשת", "יש להתחבר כדי לחפש תורים", [
                { text: "ביטול", style: "cancel" },
                { text: "התחבר", onPress: () => router.push("/login") }
            ]);
            return;
        }

        // איפוס חלקי בפתיחה מחדש
        if (!selectedWorker && workers.length > 0) setSelectedWorker(workers[0]);
        if (!selectedService && services.length > 0) setSelectedService(services[0]);

        setVisible(true);
        setStep('form');
    };

    const handleSearch = async () => {
        if (!selectedWorker || !selectedService) {
            Alert.alert("חסרים פרטים", "יש לבחור מטפל וסוג טיפול.");
            return;
        }

        setLoading(true);
        try {
            const endpoint = `/appointments/nearest-slots?worker=${selectedWorker._id}&duration=${selectedService.duration}`;
            const response = await apiGet<SlotResponse>(endpoint);

            if (response && Array.isArray(response.slots) && response.slots.length > 0) {
                setSlots(response.slots);
                setStep('results');
            } else {
                setSlots([]);
                Alert.alert("לא נמצאו תורים", "לא מצאנו תורים פנויים בטווח הקרוב. נסה לשנות מטפל או יום.");
            }
        } catch (error) {
            console.error("QuickBook Error:", error);
            Alert.alert("שגיאה", "אירעה תקלה בחיפוש התורים.");
        } finally {
            setLoading(false);
        }
    };

    const handleSlotClick = (dateIso: string) => {
        setVisible(false);

        router.push({
            pathname: "/orderTor",
            params: {
                preSelectedDate: dateIso,
                workerId: selectedWorker?._id,
                serviceId: selectedService?._id
            }
        });
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        const dateStr = d.toLocaleDateString("he-IL", { day: '2-digit', month: '2-digit' });
        const timeStr = d.toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} בשעה ${timeStr}`;
    };

    return (
        <View style={styles.buttonWrap}>
            <TouchableOpacity
                style={[styles.bookBtn, { backgroundColor: theme.secondary, borderColor: theme.third }]}
                onPress={handleOpen}
                activeOpacity={0.8}
            >
                <Text style={[styles.bookBtnText, { color: theme.third }]}>חיפוש תור זריז ⚡</Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeIcon}>
                            <Text style={styles.closeIconText}>✕</Text>
                        </TouchableOpacity>

                        {!loading && step === 'form' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.modalTitle}>חיפוש תור מהיר</Text>

                                {/* בחירת עובד */}
                                <Text style={styles.label}>מי מטפל בך?</Text>

                                {workers.length > 0 ? (
                                    <View style={{ height: 50 }}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                            {workers.map(w => {
                                                const isSelected = selectedWorker?._id === w._id;
                                                return (
                                                    <TouchableOpacity
                                                        key={w._id}
                                                        style={[styles.chip, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                                        onPress={() => setSelectedWorker(w)}
                                                    >
                                                        <Text style={[styles.chipText, isSelected && { color: '#fff' }]}>{w.name}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                ) : (
                                    <Text style={styles.emptyText}>טוען נתונים...</Text>
                                )}

                                {/* בחירת שירות */}
                                <Text style={styles.label}>איזה טיפול?</Text>
                                <ScrollView style={styles.servicesList}>
                                    {services.map(s => {
                                        const isSelected = selectedService?._id === s._id;
                                        return (
                                            <TouchableOpacity
                                                key={s._id}
                                                style={[styles.serviceItem, isSelected && { backgroundColor: '#f0f9ff', borderColor: theme.primary }]}
                                                onPress={() => setSelectedService(s)}
                                            >
                                                <Text style={[styles.serviceText, isSelected && { fontWeight: '700', color: theme.primary }]}>
                                                    {s.name} <Text style={styles.serviceDuration}>({s.duration} דק')</Text>
                                                </Text>
                                                {isSelected && <Text style={{ color: theme.primary }}>✓</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={handleSearch}>
                                    <Text style={styles.actionButtonText}>חפש תורים פנויים</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!loading && step === 'results' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.modalTitle}>תורים קרובים פנויים</Text>
                                <FlatList
                                    data={slots}
                                    keyExtractor={item => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.slotItem} onPress={() => handleSlotClick(item)}>
                                            <Text style={styles.slotText}>{formatDate(item)}</Text>
                                            <Text style={[styles.slotAction, { color: theme.primary }]}>הזמן »</Text>
                                        </TouchableOpacity>
                                    )}
                                    style={styles.slotsList}
                                />
                                <TouchableOpacity onPress={() => setStep('form')} style={styles.backButton}>
                                    <Text style={styles.backButtonText}>חזרה לחיפוש</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={styles.loadingText}>מחפש את התורים הכי קרובים...</Text>
                            </View>
                        )}

                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonWrap: { marginTop: 12, width: "100%", alignItems: "center", marginBottom: 8 },
    bookBtn: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 2 },
    bookBtnText: { fontSize: 16, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 20, padding: 24, maxHeight: '85%', elevation: 10 },
    closeIcon: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },
    closeIconText: { fontSize: 20, color: '#9ca3af', fontWeight: 'bold' },
    stepContainer: { width: '100%' },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#111827' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151', textAlign: 'right', marginTop: 10 },

    chipsContainer: { flexDirection: 'row-reverse', paddingVertical: 4 }, // RTL
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f3f4f6', marginLeft: 8, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    chipText: { color: '#374151', fontSize: 14, fontWeight: '500' },
    emptyText: { textAlign: 'right', color: '#999', fontSize: 13, fontStyle: 'italic' },

    servicesList: { maxHeight: 200, marginTop: 4 },
    serviceItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 8, backgroundColor: '#fff' },
    serviceText: { fontSize: 15, color: '#1f2937' },
    serviceDuration: { fontSize: 13, color: '#6b7280' },

    actionButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    slotsList: { maxHeight: 300, marginTop: 10 },
    slotItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    slotText: { fontSize: 16, fontWeight: '500', color: '#111' },
    slotAction: { fontSize: 14, fontWeight: '700' },
    backButton: { marginTop: 16, alignSelf: 'center', padding: 10 },
    backButtonText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },

    loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, fontSize: 14, color: '#6b7280' },
});
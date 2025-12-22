import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessDataContext } from '../contexts/BusinessDataContext';
import { apiGet, URL } from '../services/api';

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

export const QuickBookButton = () => {
    const router = useRouter();
    const { userToken } = useAuth();
    const { businessData, colors } = useBusinessDataContext();

    const workers = (businessData?.workers || []) as Worker[];
    const services = (businessData?.services || []) as Service[];

    // UI States
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<'form' | 'results'>('form');
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<string[]>([]);

    // Selections
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // הגדרת הצבעים בדיוק כמו ב-Index.tsx
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6", // צבע רקע לכפתור
        third: colors?.third ?? "#0b1120",       // צבע טקסט ומסגרת
    };

    const handleOpen = () => {
        if (!userToken) {
            Alert.alert("התחברות נדרשת", "יש להתחבר כדי לחפש תורים");
            return;
        }
        if (!selectedWorker && workers.length > 0) setSelectedWorker(workers[0]);
        if (!selectedService && services.length > 0) setSelectedService(services[0]);

        setVisible(true);
        setStep('form');
    };

    const handleSearch = async () => {
        if (!selectedWorker || !selectedService) {
            Alert.alert("חסרים פרטים", "יש לבחור עובד ושירות");
            return;
        }

        setLoading(true);
        try {
            const endpoint = `${URL}/appointments/nearest-slots?worker=${selectedWorker._id}&duration=${selectedService.duration}`;
            const response = await apiGet(endpoint);

            if (response && Array.isArray(response.slots)) {
                setSlots(response.slots);
                setStep('results');
            } else {
                setSlots([]);
                Alert.alert("הודעה", "לא נמצאו תורים פנויים בטווח הקרוב");
            }

        } catch (error) {
            console.error("QuickBook Error:", error);
            Alert.alert("שגיאה", "תקלה בחיפוש התורים");
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
        return `${d.getDate()}/${d.getMonth() + 1} בשעה ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.buttonWrap}>
            <TouchableOpacity
                style={[
                    styles.bookBtn,
                    {
                        backgroundColor: colorsSafe.secondary, // רקע בהיר (כמו הכפתור הראשי)
                        borderColor: colorsSafe.third          // מסגרת כהה
                    }
                ]}
                onPress={handleOpen}
            >
                <Text style={[styles.bookBtnText, { color: colorsSafe.third }]}>
                    לתורים הקרובים
                </Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeIcon}>
                            <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
                        </TouchableOpacity>

                        {!loading && step === 'form' && (
                            <View>
                                <Text style={styles.title}>חיפוש תור מהיר</Text>

                                <Text style={styles.label}>מי מטפל בך?</Text>
                                <View style={{ height: 50 }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {workers.map(w => {
                                            const isSelected = selectedWorker?._id === w._id;
                                            return (
                                                <TouchableOpacity
                                                    key={w._id}
                                                    style={[styles.chip, isSelected && { backgroundColor: colorsSafe.primary }]}
                                                    onPress={() => setSelectedWorker(w)}
                                                >
                                                    <Text style={[styles.chipText, isSelected && { color: '#fff' }]}>
                                                        {w.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <Text style={styles.label}>איזה טיפול?</Text>
                                <ScrollView style={{ maxHeight: 200 }}>
                                    {services.map(s => {
                                        const isSelected = selectedService?._id === s._id;
                                        return (
                                            <TouchableOpacity
                                                key={s._id}
                                                style={[styles.listItem, isSelected && { backgroundColor: '#f0f0f0', borderColor: colorsSafe.primary }]}
                                                onPress={() => setSelectedService(s)}
                                            >
                                                <Text style={{ fontWeight: isSelected ? 'bold' : 'normal', color: '#333' }}>
                                                    {s.name} ({s.duration} דק')
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                                    onPress={handleSearch}
                                >
                                    <Text style={[styles.btnText, { color: '#fff' }]}>חפש תורים פנויים</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!loading && step === 'results' && (
                            <View style={{ height: 350 }}>
                                <Text style={styles.title}>תורים קרובים</Text>

                                {slots.length === 0 ? (
                                    <Text style={{ textAlign: 'center', marginTop: 20 }}>לא נמצאו תורים לטווח הקרוב.</Text>
                                ) : (
                                    <FlatList
                                        data={slots}
                                        keyExtractor={item => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.slotItem}
                                                onPress={() => handleSlotClick(item)}
                                            >
                                                <Text style={styles.slotText}>{formatDate(item)}</Text>
                                                <Text style={{ color: colorsSafe.primary, fontWeight: 'bold' }}>הזמן »</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                )}
                                <TouchableOpacity onPress={() => setStep('form')} style={{ marginTop: 15, alignSelf: 'center' }}>
                                    <Text style={{ color: 'blue' }}>חזרה</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {loading && (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colorsSafe.primary} />
                                <Text style={{ marginTop: 10 }}>בודק ביומן...</Text>
                            </View>
                        )}

                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    // 👇 העתקתי את העיצוב מה-index.tsx כדי שזה יהיה זהה
    buttonWrap: {
        marginTop: 8,
        width: "100%",
        alignItems: "center",
        marginBottom: 16,
    },
    bookBtn: {
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },
    bookBtnText: {
        fontSize: 18,
        fontWeight: "600",
    },

    // --- סגנונות המודאל נשארים ללא שינוי ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 15, padding: 20, maxHeight: '80%', elevation: 5 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    label: { fontWeight: 'bold', marginTop: 10, marginBottom: 8, color: '#555', textAlign: 'left' },
    chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', marginRight: 8, justifyContent: 'center', height: 40 },
    chipText: { color: '#333', fontSize: 14 },
    listItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: 'transparent' },
    actionButton: { padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
    btnText: { fontSize: 16, fontWeight: 'bold' }, // הוספתי את זה כי זה היה חסר בתוך המודאל
    slotItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    slotText: { fontSize: 16, fontWeight: '600', color: '#333' },
    closeIcon: { position: 'absolute', top: 10, right: 15, zIndex: 10, padding: 5 }
});
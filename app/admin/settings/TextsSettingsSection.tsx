// app/admin/settings/TextsSettingsSection.tsx
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { apiPatch } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type TextFieldType = "address" | "message" | "about";

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function TextsSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();

    const business = (businessData || {}) as any;
    const businessId = business?._id;

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
    };

    // State
    const [address, setAddress] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [aboutUs, setAboutUs] = useState<string>("");

    const [loadingState, setLoadingState] = useState<Record<TextFieldType, boolean>>({
        address: false,
        message: false,
        about: false,
    });

    // Sync state with businessData
    useEffect(() => {
        setAddress(business.address || "");
        setMessage(business.message || "");
        setAboutUs(business.aboutUs || "");
    }, [business.address, business.message, business.aboutUs]);

    if (!businessId) return null;

    // --- Generic Handler ---

    const handleSave = async (field: TextFieldType, value: string) => {
        // מיפוי שמות השדות ל-Endpoint בשרת
        // הערה: ה-API הנוכחי משתמש בנתיבים שונים לכל שדה:
        // /address, /message, /about
        // וגוף הבקשה שונה: {address}, {message}, {aboutUs}

        let endpoint = "";
        let body = {};

        switch (field) {
            case "address":
                endpoint = `/businesses/${businessId}/address`;
                body = { address: value };
                break;
            case "message":
                endpoint = `/businesses/${businessId}/message`;
                body = { message: value };
                break;
            case "about":
                endpoint = `/businesses/${businessId}/about`;
                body = { aboutUs: value };
                break;
        }

        try {
            setLoadingState(prev => ({ ...prev, [field]: true }));

            const res = await apiPatch(endpoint, body);

            if (res) {
                await refetch();
                Alert.alert("הצלחה", "השינויים נשמרו בהצלחה.");
            } else {
                Alert.alert("שגיאה", "לא ניתן לשמור את השינויים.");
            }
        } catch (err) {
            console.error(`Save ${field} error:`, err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירה.");
        } finally {
            setLoadingState(prev => ({ ...prev, [field]: false }));
        }
    };

    return (
        <View style={{ gap: 16 }}>
            {/* --- Address --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>כתובת העסק</Text>
                <Text style={styles.cardSubtitle}>
                    הכתובת שתופיע במסך הראשי ובכפתור הניווט.
                </Text>

                <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="לדוגמה: הרצל 10, תל אביב"
                    style={styles.input}
                />

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                    onPress={() => handleSave("address", address)}
                    disabled={loadingState.address}
                >
                    {loadingState.address ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>שמירת כתובת</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* --- Popup Message --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>הודעה קופצת ללקוח</Text>
                <Text style={styles.cardSubtitle}>
                    טקסט שיוצג בחלונית הודעה (לדוגמה: מבצעים, חגים, שינויים).
                </Text>

                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="הקלד הודעה ללקוחות..."
                    style={[styles.input, styles.textArea]}
                    multiline
                />

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                    onPress={() => handleSave("message", message)}
                    disabled={loadingState.message}
                >
                    {loadingState.message ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>שמירת הודעה</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* --- About Us --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>קצת עלינו</Text>
                <Text style={styles.cardSubtitle}>
                    טקסט שיוצג ללקוחות כדף "עלינו" או באזור מידע על העסק.
                </Text>

                <TextInput
                    value={aboutUs}
                    onChangeText={setAboutUs}
                    placeholder="ספר על העסק, על הצוות, על הסיפור שלכם..."
                    style={[styles.input, styles.textAreaLarge]}
                    multiline
                />

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                    onPress={() => handleSave("about", aboutUs)}
                    disabled={loadingState.about}
                >
                    {loadingState.about ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>שמירת טקסט</Text>
                    )}
                </TouchableOpacity>
            </View>
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
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
        textAlign: "right",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "right",
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: "#f9fafb",
        textAlign: "right", // עברית
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top", // חשוב ל-multiline
    },
    textAreaLarge: {
        minHeight: 140,
        textAlignVertical: "top", // חשוב ל-multiline
    },
    actionButton: {
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
});
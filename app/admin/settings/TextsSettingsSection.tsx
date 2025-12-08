// app/admin/settings/TextsSettingsSection.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL } from "@/services/api";
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

export default function TextsSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const business = (businessData || {}) as any;
    const businessId = business?._id;

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [address, setAddress] = useState<string>(business.address || "");
    const [message, setMessage] = useState<string>(business.message || "");
    const [aboutUs, setAboutUs] = useState<string>(business.aboutUs || "");

    const [savingAddress, setSavingAddress] = useState(false);
    const [savingMessage, setSavingMessage] = useState(false);
    const [savingAbout, setSavingAbout] = useState(false);

    useEffect(() => {
        setAddress(business.address || "");
        setMessage(business.message || "");
        setAboutUs(business.aboutUs || "");
    }, [business.address, business.message, business.aboutUs]);

    if (!businessId) {
        return null;
    }

    const handleSaveAddress = async () => {
        try {
            setSavingAddress(true);

            const res = await fetch(
                `${URL}/businesses/${businessId}/address`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ address }),
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 save address response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("save address error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לשמור כתובת כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "הכתובת נשמרה.");
        } catch (err) {
            console.log("save address error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירת הכתובת.");
        } finally {
            setSavingAddress(false);
        }
    };

    const handleSaveMessage = async () => {
        try {
            setSavingMessage(true);

            const res = await fetch(
                `${URL}/businesses/${businessId}/message`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ message }),
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 save message response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("save message error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לשמור הודעה כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "ההודעה נשמרה.");
        } catch (err) {
            console.log("save message error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירת ההודעה.");
        } finally {
            setSavingMessage(false);
        }
    };

    const handleSaveAbout = async () => {
        try {
            setSavingAbout(true);

            const res = await fetch(
                `${URL}/businesses/${businessId}/about`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ aboutUs }),
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 save about response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("save about error:", rawText);
                Alert.alert(
                    "שגיאה",
                    "לא ניתן לשמור טקסט 'עלינו' כרגע."
                );
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "טקסט 'עלינו' נשמר.");
        } catch (err) {
            console.log("save about error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בשמירת הטקסט.");
        } finally {
            setSavingAbout(false);
        }
    };

    return (
        <View style={{ gap: 16 }}>
            {/* כתובת העסק */}
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
                    style={[
                        styles.actionButton,
                        { backgroundColor: colorsSafe.primary, marginTop: 8 },
                    ]}
                    onPress={handleSaveAddress}
                    disabled={savingAddress}
                >
                    {savingAddress ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            שמירת כתובת
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* הודעה קופצת */}
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
                    style={[
                        styles.actionButton,
                        { backgroundColor: colorsSafe.primary, marginTop: 8 },
                    ]}
                    onPress={handleSaveMessage}
                    disabled={savingMessage}
                >
                    {savingMessage ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            שמירת הודעה
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* עלינו */}
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
                    style={[
                        styles.actionButton,
                        { backgroundColor: colorsSafe.primary, marginTop: 8 },
                    ]}
                    onPress={handleSaveAbout}
                    disabled={savingAbout}
                >
                    {savingAbout ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            שמירת טקסט
                        </Text>
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
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: "#f9fafb",
        textAlign: "right",
    },
    textArea: {
        minHeight: 80,
    },
    textAreaLarge: {
        minHeight: 140,
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
});

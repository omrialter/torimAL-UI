import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL } from "@/services/api";

// אותם שמות כמו בשרת
const PRESET_OPTIONS = [
    { key: "professional", label: "Professional" },
    { key: "midnight", label: "Midnight" },
    { key: "forest", label: "Forest" },
    { key: "sunset", label: "Sunset" },
    { key: "royal", label: "Royal" },
];

const DAY_LABELS: { key: string; label: string }[] = [
    { key: "sunday", label: "ראשון" },
    { key: "monday", label: "שני" },
    { key: "tuesday", label: "שלישי" },
    { key: "wednesday", label: "רביעי" },
    { key: "thursday", label: "חמישי" },
    { key: "friday", label: "שישי" },
    { key: "saturday", label: "שבת" },
];

export default function Settings() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { isAdmin, userToken } = useAuth();

    // 👇 הגנות – תמיד יש לנו אובייקטים עם ברירות מחדל
    const business = (businessData || {}) as any;
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [updatingPreset, setUpdatingPreset] = useState<string | null>(null);

    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingBanner2, setUploadingBanner2] = useState(false);
    const [uploadingBanner3, setUploadingBanner3] = useState(false);

    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [deletingBanner, setDeletingBanner] = useState(false);
    const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(
        null
    );

    // טקסטים
    const [address, setAddress] = useState<string>(business.address || "");
    const [message, setMessage] = useState<string>(business.message || "");
    const [aboutUs, setAboutUs] = useState<string>(business.aboutUs || "");

    const [savingAddress, setSavingAddress] = useState(false);
    const [savingMessage, setSavingMessage] = useState(false);
    const [savingAbout, setSavingAbout] = useState(false);
    const [savingOpeningHours, setSavingOpeningHours] = useState(false);

    const businessId = business?._id;

    // סטייט לגלריית התמונות
    const [portfolio, setPortfolio] = useState<string[]>(business.portfolio || []);

    // סטייט לשעות פתיחה
    const [openingHours, setOpeningHours] = useState<any>(
        business.openingHours || {}
    );

    // סנכרון כשנטענים נתוני העסק
    useEffect(() => {
        setPortfolio(business.portfolio || []);
        setAddress(business.address || "");
        setMessage(business.message || "");
        setAboutUs(business.aboutUs || "");
        setOpeningHours(business.openingHours || {});
    }, [
        business.portfolio,
        business.address,
        business.message,
        business.aboutUs,
        business.openingHours,
    ]);

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text>אין לך הרשאות לעמוד זה.</Text>
            </View>
        );
    }

    if (!businessId) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>טוען נתוני עסק...</Text>
            </View>
        );
    }

    // שינוי preset צבעים דרך השרת
    const handleChangePreset = async (presetKey: string) => {
        try {
            setUpdatingPreset(presetKey);

            const res = await fetch(`${URL}/businesses/colors`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": userToken || "",
                },
                body: JSON.stringify({ preset: presetKey }),
            });

            const rawText = await res.text();
            console.log(
                "📥 change preset response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("change preset error:", rawText);
                Alert.alert("שגיאה", "לא ניתן לעדכן צבעים כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "צבעי העסק עודכנו.");
        } catch (err) {
            console.log("change preset error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בעדכון הצבעים.");
        } finally {
            setUpdatingPreset(null);
        }
    };

    // בחירת מדיה מהגלריה
    const pickMedia = async (forBanner: boolean) => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("שגיאה", "אין הרשאה לגשת לגלריה.");
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: forBanner
                ? ImagePicker.MediaTypeOptions.All
                : ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return null;
        }

        return result.assets[0];
    };

    // העלאת באנר ראשי (תמונה/וידאו)
    const handleUploadBanner = async () => {
        const asset = await pickMedia(true);
        if (!asset) return;

        try {
            setUploadingBanner(true);

            console.log("📤 handleUploadBanner: picked asset:", asset);

            const formData = new FormData();
            formData.append("file", {
                uri: asset.uri,
                name: (asset as any).fileName || "banner",
                type: (asset as any).mimeType || "application/octet-stream",
            } as any);

            const res = await fetch(
                `${URL}/businesses/${businessId}/banner`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key": userToken || "",
                    },
                    body: formData,
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 upload banner raw response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("upload banner error:", rawText);
                Alert.alert("שגיאה", "לא ניתן להעלות באנר כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "הבאנר עודכן בהצלחה.");
        } catch (err) {
            console.log("❌ upload banner error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בעת העלאת הבאנר.");
        } finally {
            setUploadingBanner(false);
        }
    };

    // העלאת באנר 2 (תמונה בלבד)
    const handleUploadBanner2 = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingBanner2(true);

            console.log("📤 handleUploadBanner2: picked asset:", asset);

            const formData = new FormData();
            formData.append("file", {
                uri: asset.uri,
                name: (asset as any).fileName || "banner2",
                type: (asset as any).mimeType || "image/jpeg",
            } as any);

            const res = await fetch(
                `${URL}/businesses/${businessId}/banner2`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key": userToken || "",
                    },
                    body: formData,
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 upload banner2 response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("upload banner2 error:", rawText);
                Alert.alert("שגיאה", "לא ניתן להעלות באנר 2 כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "באנר 2 עודכן בהצלחה.");
        } catch (err) {
            console.log("upload banner2 error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בעת העלאת באנר 2.");
        } finally {
            setUploadingBanner2(false);
        }
    };

    // העלאת באנר 3 (תמונה בלבד)
    const handleUploadBanner3 = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingBanner3(true);

            console.log("📤 handleUploadBanner3: picked asset:", asset);

            const formData = new FormData();
            formData.append("file", {
                uri: asset.uri,
                name: (asset as any).fileName || "banner3",
                type: (asset as any).mimeType || "image/jpeg",
            } as any);

            const res = await fetch(
                `${URL}/businesses/${businessId}/banner3`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key": userToken || "",
                    },
                    body: formData,
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 upload banner3 response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("upload banner3 error:", rawText);
                Alert.alert("שגיאה", "לא ניתן להעלות באנר 3 כרגע.");
                return;
            }

            await refetch();
            Alert.alert("הצלחה", "באנר 3 עודכן בהצלחה.");
        } catch (err) {
            console.log("upload banner3 error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בעת העלאת באנר 3.");
        } finally {
            setUploadingBanner3(false);
        }
    };

    // מחיקת באנר ראשי
    const handleDeleteBanner = () => {
        if (!business.banner) {
            Alert.alert("הודעה", "אין באנר למחוק.");
            return;
        }

        Alert.alert("מחיקת באנר", "האם אתה בטוח שברצונך למחוק את הבאנר?", [
            { text: "ביטול", style: "cancel" },
            {
                text: "מחק",
                style: "destructive",
                onPress: async () => {
                    try {
                        setDeletingBanner(true);

                        const res = await fetch(
                            `${URL}/businesses/${businessId}/banner`,
                            {
                                method: "DELETE",
                                headers: {
                                    "x-api-key": userToken || "",
                                },
                            }
                        );

                        const rawText = await res.text();
                        console.log(
                            "📥 delete banner response:",
                            res.status,
                            rawText.substring(0, 500)
                        );

                        if (!res.ok) {
                            console.log("delete banner error:", rawText);
                            Alert.alert(
                                "שגיאה",
                                "לא ניתן למחוק את הבאנר כרגע."
                            );
                            return;
                        }

                        await refetch();
                        Alert.alert("הצלחה", "הבאנר נמחק.");
                    } catch (err) {
                        console.log("delete banner error (exception):", err);
                        Alert.alert("שגיאה", "אירעה תקלה במחיקת הבאנר.");
                    } finally {
                        setDeletingBanner(false);
                    }
                },
            },
        ]);
    };

    // העלאת תמונה לגלריה – בלי apiFetch, בלי refetch
    const handleUploadPortfolio = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingPortfolio(true);

            console.log("📤 handleUploadPortfolio: picked asset:", asset);

            const formData = new FormData();
            formData.append("file", {
                uri: asset.uri,
                name: (asset as any).fileName || "portfolio-image",
                type: (asset as any).mimeType || "image/jpeg",
            } as any);

            const res = await fetch(
                `${URL}/businesses/${businessId}/portfolio`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key": userToken || "",
                    },
                    body: formData,
                }
            );

            const rawText = await res.text();
            console.log(
                "📥 upload portfolio response:",
                res.status,
                rawText.substring(0, 500)
            );

            if (!res.ok) {
                console.log("upload portfolio error:", rawText);
                Alert.alert("שגיאה", "לא ניתן להעלות תמונה לגלריה כרגע.");
                return;
            }

            let newUrl: string | undefined;
            try {
                const data = JSON.parse(rawText);
                newUrl = data.url;
            } catch (e) {
                console.log("parse portfolio response error:", e);
            }

            if (newUrl) {
                setPortfolio((prev) => [...prev, newUrl!]);
            } else {
                console.log(
                    "⚠️ no url field in portfolio response, UI not updated"
                );
            }

            Alert.alert("הצלחה", "התמונה נוספה לגלריה.");
        } catch (err) {
            console.log("upload portfolio error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בהעלאת התמונה.");
        } finally {
            setUploadingPortfolio(false);
        }
    };

    // מחיקת תמונה אחת מהגלריה
    const handleDeletePortfolioImage = (imageUrl: string) => {
        Alert.alert("מחיקת תמונה", "למחוק את התמונה מהגלריה?", [
            { text: "ביטול", style: "cancel" },
            {
                text: "מחק",
                style: "destructive",
                onPress: async () => {
                    try {
                        setDeletingImageUrl(imageUrl);

                        const res = await fetch(
                            `${URL}/businesses/${businessId}/portfolio`,
                            {
                                method: "DELETE",
                                headers: {
                                    "Content-Type": "application/json",
                                    "x-api-key": userToken || "",
                                },
                                body: JSON.stringify({ imageUrl }),
                            }
                        );

                        const rawText = await res.text();
                        console.log(
                            "📥 delete portfolio image response:",
                            res.status,
                            rawText.substring(0, 500)
                        );

                        if (!res.ok) {
                            console.log(
                                "delete portfolio image error:",
                                rawText
                            );
                            Alert.alert(
                                "שגיאה",
                                "לא ניתן למחוק את התמונה כרגע."
                            );
                            return;
                        }

                        setPortfolio((prev) =>
                            prev.filter((url) => url !== imageUrl)
                        );
                    } catch (err) {
                        console.log(
                            "delete portfolio image error (exception):",
                            err
                        );
                        Alert.alert(
                            "שגיאה",
                            "אירעה תקלה במחיקת התמונה."
                        );
                    } finally {
                        setDeletingImageUrl(null);
                    }
                },
            },
        ]);
    };

    // שמירת כתובת
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

    // שמירת הודעה קופצת
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

    // שמירת עלינו
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

    // שינוי שעת פתיחה/סגירה בסטייט
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

    // כפתור "סגור יום" – מסמן את היום כסגור (open/close = null)
    const handleClearDay = (dayKey: string) => {
        setOpeningHours((prev: any) => ({
            ...prev,
            [dayKey]: { open: null, close: null },
        }));
    };

    // שמירת שעות פתיחה
    const handleSaveOpeningHours = async () => {
        try {
            setSavingOpeningHours(true);

            const res = await fetch(
                `${URL}/businesses/${businessId}/opening-hours`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": userToken || "",
                    },
                    body: JSON.stringify({ openingHours }),
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

    // זיהוי האם הבאנר הראשי הוא וידאו
    const bannerUrl: string | undefined = business.banner;
    const isVideoBanner =
        typeof bannerUrl === "string" &&
        /\.(mp4|mov|mkv|webm|avi)$/i.test(bannerUrl);

    return (
        <ScrollView
            style={[styles.root, { backgroundColor: colorsSafe.secondary }]}
            contentContainerStyle={styles.content}
        >
            <Text style={[styles.title, { color: colorsSafe.primary }]}>
                הגדרות עסק
            </Text>

            {/* צבעים */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>צבעי אפליקציה</Text>
                <Text style={styles.cardSubtitle}>
                    בחר קומבינציית צבעים למיתוג האפליקציה.
                </Text>

                <View style={styles.presetsRow}>
                    {PRESET_OPTIONS.map((p) => (
                        <TouchableOpacity
                            key={p.key}
                            style={[
                                styles.presetButton,
                                updatingPreset === p.key && {
                                    borderColor: colorsSafe.primary,
                                },
                            ]}
                            onPress={() => handleChangePreset(p.key)}
                            disabled={!!updatingPreset}
                        >
                            <Text style={styles.presetLabel}>{p.label}</Text>
                            {updatingPreset === p.key && (
                                <ActivityIndicator size="small" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* באנר ראשי */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>באנר ראשי</Text>
                <Text style={styles.cardSubtitle}>
                    העלה וידאו או תמונה שתופיע בחלק העליון של האפליקציה.
                </Text>

                {bannerUrl ? (
                    <View style={styles.bannerPreviewWrap}>
                        <Text style={styles.cardSubtitle}>באנר נוכחי:</Text>
                        {isVideoBanner ? (
                            <Video
                                source={{ uri: bannerUrl }}
                                style={styles.bannerPreview}
                                useNativeControls
                                resizeMode={ResizeMode.COVER}
                                isMuted
                            />
                        ) : (
                            <Image
                                source={{ uri: bannerUrl }}
                                style={styles.bannerPreview}
                                resizeMode="cover"
                            />
                        )}
                    </View>
                ) : (
                    <Text style={styles.cardSubtitle}>אין באנר מוגדר.</Text>
                )}

                <View style={styles.row}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colorsSafe.primary },
                        ]}
                        onPress={handleUploadBanner}
                        disabled={uploadingBanner}
                    >
                        {uploadingBanner ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>
                                החלפת באנר
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleDeleteBanner}
                        disabled={deletingBanner}
                    >
                        {deletingBanner ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>
                                מחיקת באנר
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* באנרים נוספים */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>באנרים נוספים</Text>
                <Text style={styles.cardSubtitle}>
                    ניתן להוסיף עוד שני באנרים לתצוגה במקומות שונים באפליקציה.
                </Text>

                {/* באנר 2 */}
                <View style={{ marginTop: 8, gap: 6 }}>
                    <Text style={styles.cardSubtitle}>באנר 2:</Text>
                    {business.banner2 ? (
                        <Image
                            source={{ uri: business.banner2 }}
                            style={styles.bannerPreviewSmall}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.cardSubtitle}>
                            אין באנר 2 מוגדר.
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colorsSafe.primary },
                        ]}
                        onPress={handleUploadBanner2}
                        disabled={uploadingBanner2}
                    >
                        {uploadingBanner2 ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>
                                העלאת/החלפת באנר 2
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* באנר 3 */}
                <View style={{ marginTop: 12, gap: 6 }}>
                    <Text style={styles.cardSubtitle}>באנר 3:</Text>
                    {business.banner3 ? (
                        <Image
                            source={{ uri: business.banner3 }}
                            style={styles.bannerPreviewSmall}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.cardSubtitle}>
                            אין באנר 3 מוגדר.
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colorsSafe.primary },
                        ]}
                        onPress={handleUploadBanner3}
                        disabled={uploadingBanner3}
                    >
                        {uploadingBanner3 ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>
                                העלאת/החלפת באנר 3
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* גלריה */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>גלריית עבודות</Text>
                <Text style={styles.cardSubtitle}>
                    הוסף או מחק תמונות מהגלריה שמוצגת ללקוחות.
                </Text>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: colorsSafe.primary, marginBottom: 12 },
                    ]}
                    onPress={handleUploadPortfolio}
                    disabled={uploadingPortfolio}
                >
                    {uploadingPortfolio ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            הוספת תמונה לגלריה
                        </Text>
                    )}
                </TouchableOpacity>

                <View style={styles.galleryGrid}>
                    {portfolio.length === 0 && (
                        <Text style={styles.cardSubtitle}>
                            עדיין אין תמונות בגלריה.
                        </Text>
                    )}

                    {portfolio.map((imgUrl: string) => (
                        <View key={imgUrl} style={styles.galleryItem}>
                            <Image
                                source={{ uri: imgUrl }}
                                style={styles.galleryImage}
                            />
                            <TouchableOpacity
                                style={styles.deleteBadge}
                                onPress={() => handleDeletePortfolioImage(imgUrl)}
                                disabled={deletingImageUrl === imgUrl}
                            >
                                {deletingImageUrl === imgUrl ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBadgeText}>✕</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

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
                        <Text style={styles.actionButtonText}>שמירת כתובת</Text>
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
                        <Text style={styles.actionButtonText}>שמירת הודעה</Text>
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
                        <Text style={styles.actionButtonText}>שמירת טקסט</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* שעות פתיחה */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>שעות פתיחה</Text>
                <Text style={styles.cardSubtitle}>
                    פורמט: HH:MM (לדוגמה 09:00). אפשר להשאיר ריק או ללחוץ "סגור יום" אם סגור.
                </Text>

                <View style={{ marginTop: 8, gap: 8 }}>
                    {DAY_LABELS.map(({ key, label }) => {
                        const dayObj = openingHours?.[key] || {
                            open: "",
                            close: "",
                        };
                        const isClosed =
                            dayObj.open == null && dayObj.close == null;

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
                                                isClosed && { opacity: 0.5 },
                                            ]}
                                            editable={!isClosed}
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
                                                isClosed && { opacity: 0.5 },
                                            ]}
                                            editable={!isClosed}
                                        />
                                    </View>
                                </View>

                                {/* כפתור סגירת יום */}
                                <TouchableOpacity
                                    style={[
                                        styles.closeDayButton,
                                        isClosed && styles.closeDayButtonActive,
                                    ]}
                                    onPress={() => handleClearDay(key)}
                                >
                                    <Text style={styles.closeDayButtonText}>
                                        {isClosed ? "יום סגור" : "סגור יום"}
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
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
        gap: 16,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
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
    presetsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    presetButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    presetLabel: {
        fontSize: 13,
    },
    bannerPreviewWrap: {
        marginTop: 8,
        gap: 6,
    },
    bannerPreview: {
        width: "100%",
        height: 160,
        borderRadius: 12,
        backgroundColor: "#e5e7eb",
    },
    bannerPreviewSmall: {
        width: "100%",
        height: 100,
        borderRadius: 12,
        backgroundColor: "#e5e7eb",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    dangerButton: {
        backgroundColor: "#ef4444",
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
    galleryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 8,
    },
    galleryItem: {
        width: "30%",
        aspectRatio: 1,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#e5e7eb",
    },
    galleryImage: {
        width: "100%",
        height: "100%",
    },
    deleteBadge: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: "#ef4444",
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
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
});

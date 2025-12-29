// app/admin/settings/MediaSettingsSection.tsx
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { URL, apiDelete } from "@/services/api"; // ייבוא ה-URL נדרש כאן להעלאת קבצים

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type BannerType = "banner" | "banner2" | "banner3";

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function MediaSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const business = (businessData || {}) as any;
    const businessId = business?._id;
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
    };

    // State
    const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
    const [portfolio, setPortfolio] = useState<string[]>(business.portfolio || []);

    useEffect(() => {
        setPortfolio(business.portfolio || []);
    }, [business.portfolio]);

    // --- Helpers ---

    const setUploadState = (key: string, value: boolean) => {
        setUploadingState((prev) => ({ ...prev, [key]: value }));
    };

    const pickMedia = async (allowVideo: boolean) => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("שגיאה", "אין הרשאה לגשת לגלריה.");
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: allowVideo
                ? ImagePicker.MediaTypeOptions.All
                : ImagePicker.MediaTypeOptions.Images,
            quality: 0.8, // אופטימיזציה קלה
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return null;
        }

        return result.assets[0];
    };

    /**
     * פונקציה גנרית להעלאת קובץ לשרת
     * (משתמשים ב-fetch רגיל כי api.ts מותאם ל-JSON בברירת מחדל)
     */
    const uploadFile = async (endpoint: string, asset: ImagePicker.ImagePickerAsset, fieldName: string) => {
        const formData = new FormData();
        formData.append("file", {
            uri: asset.uri,
            name: asset.fileName || fieldName,
            type: asset.mimeType || (asset.type === 'video' ? "video/mp4" : "image/jpeg"),
        } as any);

        const res = await fetch(`${URL}${endpoint}`, {
            method: "POST",
            headers: {
                "x-api-key": userToken || "",
                // לא מוסיפים Content-Type: multipart/form-data ידנית, ה-fetch עושה את זה לבד עם ה-boundary
            },
            body: formData,
        });

        if (!res.ok) {
            throw new Error(await res.text());
        }
        return res;
    };

    // --- Handlers ---

    const handleUploadBanner = async (type: BannerType) => {
        // באנר ראשי תומך בווידאו, האחרים רק תמונה
        const allowVideo = type === "banner";
        const asset = await pickMedia(allowVideo);

        if (!asset) return;

        try {
            setUploadState(type, true);
            await uploadFile(`/businesses/${businessId}/${type}`, asset, type);

            await refetch();
            Alert.alert("הצלחה", "הבאנר עודכן בהצלחה.");
        } catch (err) {
            console.error(`Upload ${type} error:`, err);
            Alert.alert("שגיאה", "אירעה תקלה בעת העלאת הבאנר.");
        } finally {
            setUploadState(type, false);
        }
    };

    const handleDeleteBanner = () => {
        if (!business.banner) {
            Alert.alert("הודעה", "אין באנר למחוק.");
            return;
        }

        Alert.alert("מחיקת באנר", "האם אתה בטוח שברצונך למחוק את הבאנר הראשי?", [
            { text: "ביטול", style: "cancel" },
            {
                text: "מחק",
                style: "destructive",
                onPress: async () => {
                    try {
                        setUploadState("delete_banner", true);
                        await apiDelete(`/businesses/${businessId}/banner`);
                        await refetch();
                        Alert.alert("הצלחה", "הבאנר נמחק.");
                    } catch (err) {
                        Alert.alert("שגיאה", "אירעה תקלה במחיקת הבאנר.");
                    } finally {
                        setUploadState("delete_banner", false);
                    }
                },
            },
        ]);
    };

    const handleUploadPortfolio = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadState("portfolio", true);
            const res = await uploadFile(`/businesses/${businessId}/portfolio`, asset, "portfolio-image");

            // עדכון לוקאלי מהיר
            const data = await res.json();
            if (data.url) {
                setPortfolio((prev) => [...prev, data.url]);
            }

            Alert.alert("הצלחה", "התמונה נוספה לגלריה.");
        } catch (err) {
            console.error("Upload portfolio error:", err);
            Alert.alert("שגיאה", "אירעה תקלה בהעלאת התמונה.");
        } finally {
            setUploadState("portfolio", false);
        }
    };

    const handleDeletePortfolioImage = (imageUrl: string) => {
        Alert.alert("מחיקת תמונה", "למחוק את התמונה מהגלריה?", [
            { text: "ביטול", style: "cancel" },
            {
                text: "מחק",
                style: "destructive",
                onPress: async () => {
                    try {
                        setUploadState(`delete_${imageUrl}`, true);
                        // כאן השרת מצפה לגוף בקשה עם ה-URL ב-DELETE, שזה לא סטנדרטי אבל נתמוך בזה
                        // apiDelete שלנו תומך ב-body? אם לא, נשתמש ב-apiFetch עם method DELETE
                        const res = await fetch(`${URL}/businesses/${businessId}/portfolio`, {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                "x-api-key": userToken || "",
                            },
                            body: JSON.stringify({ imageUrl }),
                        });

                        if (res.ok) {
                            setPortfolio((prev) => prev.filter((url) => url !== imageUrl));
                        } else {
                            throw new Error("Failed to delete");
                        }

                    } catch (err) {
                        Alert.alert("שגיאה", "אירעה תקלה במחיקת התמונה.");
                    } finally {
                        setUploadState(`delete_${imageUrl}`, false);
                    }
                },
            },
        ]);
    };

    // --- Render Helpers ---

    const renderBannerPreview = (url?: string) => {
        if (!url) return <Text style={styles.emptyText}>אין באנר מוגדר.</Text>;

        const isVideo = /\.(mp4|mov|mkv|webm|avi)$/i.test(url);

        if (isVideo) {
            return (
                <Video
                    source={{ uri: url }}
                    style={styles.bannerPreview}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isMuted
                />
            );
        }
        return (
            <Image
                source={{ uri: url }}
                style={styles.bannerPreview}
                resizeMode="cover"
            />
        );
    };

    return (
        <>
            {/* --- Main Banner --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>באנר ראשי</Text>
                <Text style={styles.cardSubtitle}>
                    העלה וידאו או תמונה שתופיע בחלק העליון של האפליקציה.
                </Text>

                <View style={styles.previewContainer}>
                    {renderBannerPreview(business.banner)}
                </View>

                <View style={styles.row}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                        onPress={() => handleUploadBanner("banner")}
                        disabled={uploadingState["banner"]}
                    >
                        {uploadingState["banner"] ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>החלפת באנר</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleDeleteBanner}
                        disabled={uploadingState["delete_banner"]}
                    >
                        {uploadingState["delete_banner"] ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>מחיקה</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- Additional Banners --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>באנרים נוספים</Text>
                <Text style={styles.cardSubtitle}>
                    ניתן להוסיף עוד שני באנרים לתצוגה במקומות שונים באפליקציה.
                </Text>

                {/* Banner 2 */}
                <View style={styles.subSection}>
                    <Text style={styles.label}>באנר 2 ("קצת עלינו"):</Text>
                    {business.banner2 ? (
                        <Image source={{ uri: business.banner2 }} style={styles.bannerPreviewSmall} resizeMode="cover" />
                    ) : (
                        <Text style={styles.emptyTextSmall}>לא מוגדר</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                        onPress={() => handleUploadBanner("banner2")}
                        disabled={uploadingState["banner2"]}
                    >
                        {uploadingState["banner2"] ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>העלאה / החלפה</Text>}
                    </TouchableOpacity>
                </View>

                {/* Banner 3 */}
                <View style={styles.subSection}>
                    <Text style={styles.label}>באנר 3 (רקע "צור קשר"):</Text>
                    {business.banner3 ? (
                        <Image source={{ uri: business.banner3 }} style={styles.bannerPreviewSmall} resizeMode="cover" />
                    ) : (
                        <Text style={styles.emptyTextSmall}>לא מוגדר</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colorsSafe.primary }]}
                        onPress={() => handleUploadBanner("banner3")}
                        disabled={uploadingState["banner3"]}
                    >
                        {uploadingState["banner3"] ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>העלאה / החלפה</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- Portfolio --- */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>גלריית עבודות</Text>
                <Text style={styles.cardSubtitle}>
                    הוסף או מחק תמונות מהגלריה שמוצגת ללקוחות.
                </Text>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colorsSafe.primary, marginBottom: 12 }]}
                    onPress={handleUploadPortfolio}
                    disabled={uploadingState["portfolio"]}
                >
                    {uploadingState["portfolio"] ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>הוספת תמונה לגלריה</Text>}
                </TouchableOpacity>

                <View style={styles.galleryGrid}>
                    {portfolio.length === 0 && (
                        <Text style={styles.emptyText}>הגלריה ריקה.</Text>
                    )}

                    {portfolio.map((imgUrl) => (
                        <View key={imgUrl} style={styles.galleryItem}>
                            <Image source={{ uri: imgUrl }} style={styles.galleryImage} />

                            <TouchableOpacity
                                style={styles.deleteBadge}
                                onPress={() => handleDeletePortfolioImage(imgUrl)}
                                disabled={uploadingState[`delete_${imgUrl}`]}
                            >
                                {uploadingState[`delete_${imgUrl}`] ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBadgeText}>✕</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        </>
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
        marginBottom: 16,
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
        marginBottom: 8,
    },
    previewContainer: {
        marginVertical: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: "#f3f4f6",
    },
    bannerPreview: {
        width: "100%",
        height: 180,
        backgroundColor: "#e5e7eb",
    },
    bannerPreviewSmall: {
        width: "100%",
        height: 100,
        borderRadius: 8,
        backgroundColor: "#e5e7eb",
        marginVertical: 8,
    },
    subSection: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        paddingTop: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "right",
        marginBottom: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontStyle: 'italic',
        marginVertical: 10,
    },
    emptyTextSmall: {
        textAlign: 'right',
        color: '#9ca3af',
        fontSize: 12,
        marginBottom: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 99,
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
        gap: 8,
        marginTop: 8,
    },
    galleryItem: {
        width: "31%", // 3 in a row approx
        aspectRatio: 1,
        borderRadius: 8,
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
        backgroundColor: "rgba(239, 68, 68, 0.9)", // Red with opacity
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
});
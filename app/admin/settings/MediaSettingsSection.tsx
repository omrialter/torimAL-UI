// app/settings/MediaSettingsSection.tsx
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
import { URL } from "@/services/api";

export default function MediaSettingsSection() {
    const { businessData, colors, refetch } = useBusinessDataContext();
    const { userToken } = useAuth();

    const business = (businessData || {}) as any;
    const businessId = business?._id;
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingBanner2, setUploadingBanner2] = useState(false);
    const [uploadingBanner3, setUploadingBanner3] = useState(false);

    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [deletingBanner, setDeletingBanner] = useState(false);
    const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(
        null
    );
    const [portfolio, setPortfolio] = useState<string[]>(
        business.portfolio || []
    );

    useEffect(() => {
        setPortfolio(business.portfolio || []);
    }, [business.portfolio]);

    const pickMedia = async (forBanner: boolean) => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
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

        if (
            result.canceled ||
            !result.assets ||
            result.assets.length === 0
        ) {
            return null;
        }

        return result.assets[0];
    };

    const handleUploadBanner = async () => {
        const asset = await pickMedia(true);
        if (!asset) return;

        try {
            setUploadingBanner(true);

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

    const handleUploadBanner2 = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingBanner2(true);

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

    const handleUploadBanner3 = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingBanner3(true);

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

    const handleUploadPortfolio = async () => {
        const asset = await pickMedia(false);
        if (!asset) return;

        try {
            setUploadingPortfolio(true);

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
            }

            Alert.alert("הצלחה", "התמונה נוספה לגלריה.");
        } catch (err) {
            console.log("upload portfolio error (exception):", err);
            Alert.alert("שגיאה", "אירעה תקלה בהעלאת התמונה.");
        } finally {
            setUploadingPortfolio(false);
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

    const bannerUrl: string | undefined = business.banner;
    const isVideoBanner =
        typeof bannerUrl === "string" &&
        /\.(mp4|mov|mkv|webm|avi)$/i.test(bannerUrl);

    return (
        <>
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
                        {
                            backgroundColor: colorsSafe.primary,
                            marginBottom: 12,
                        },
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
                                onPress={() =>
                                    handleDeletePortfolioImage(imgUrl)
                                }
                                disabled={deletingImageUrl === imgUrl}
                            >
                                {deletingImageUrl === imgUrl ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBadgeText}>
                                        ✕
                                    </Text>
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
});

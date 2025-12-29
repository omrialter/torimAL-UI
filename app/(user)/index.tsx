// app/(user)/index.tsx
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Components
import BannerWithAbout from "@/components/BannerWithAbout";
import ContactInfoSection from "@/components/ContactInfoSection";
import FooterSection from "@/components/FooterSection";
import JumpingMsg from "@/components/jumpingMsg";
import { QuickBookButton } from "@/components/QuickBookButton";
import SimpleAccordion from "@/components/SimpleAccordion";
import WorksGallery from "@/components/WorksGallery";

// Contexts
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

// הגדרה מקומית לשדות שאנחנו מצפים להם מהביזנס (לנוחות ולמניעת שגיאות)
interface BusinessDataShape {
    name?: string;
    banner?: string;
    banner2?: string; // תמונת "אודות"
    banner3?: string; // תמונת רקע ל"צור קשר"
    phone?: string;
    address?: string;
    aboutUs?: string;
    portfolio?: string[];
    // קישורים לרשתות חברתיות (אם קיימים ב-DB)
    links?: {
        tiktok?: string;
        facebook?: string;
        instagram?: string;
        whatsapp?: string;
    };
    [key: string]: any;
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function Index() {
    const router = useRouter();
    const { businessData, colors } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    // המרה לטיפוס המקומי
    const business = (businessData || {}) as BusinessDataShape;

    // ערכת צבעים בטוחה
    const theme = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    // --- Handlers ---

    const handleBookAppointment = () => {
        router.push("/(user)/orderTor");
    };

    const openLink = (url?: string) => {
        if (url) {
            Linking.openURL(url).catch((err) => console.error("Failed to open URL:", err));
        }
    };

    // --- Data Processing ---

    // עיבוד הגלריה (Memoized כדי למנוע חישוב מחדש בכל רינדור)
    const gallerySources = useMemo(() => {
        const fromServer = business.portfolio || [];
        return fromServer.map((url) => ({ uri: url }));
    }, [business.portfolio]);

    const businessName = business.name || "TorimAL";

    // לוגיקת באנר ראשי (וידאו או תמונה)
    const bannerUrl = business.banner;
    const isVideoBanner = useMemo(() => {
        return typeof bannerUrl === "string" && /\.(mp4|mov|mkv|webm|avi)$/i.test(bannerUrl);
    }, [bannerUrl]);

    // עיבוד טלפון
    const phoneRaw = business.phone || "";
    const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
    const phoneForDisplay = phoneRaw || "לא צוין";

    // עיבוד כתובת
    const addressFromServer = business.address || "";
    const encodedAddress = encodeURIComponent(addressFromServer);

    // עיבוד "אודות"
    const aboutTitle = business.aboutUs ? "קצת עלינו" : "קצת על הסטודיו";
    const aboutDescription = business.aboutUs || "";
    const aboutImageSource = business.banner2 ? { uri: business.banner2 } : undefined;

    return (
        <ScrollView
            style={[styles.root, { backgroundColor: theme.secondary }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* ---------------- Hero Section ---------------- */}
            <View style={styles.heroSection}>
                <View style={[styles.bannerShadow, { shadowColor: theme.primary }]}>
                    <View style={styles.bannerWrap}>
                        {bannerUrl ? (
                            isVideoBanner ? (
                                <Video
                                    source={{ uri: bannerUrl }}
                                    style={styles.bannerMedia}
                                    resizeMode={ResizeMode.COVER}
                                    isMuted
                                    shouldPlay
                                    isLooping
                                />
                            ) : (
                                <Image
                                    source={{ uri: bannerUrl }}
                                    style={styles.bannerMedia}
                                    resizeMode="cover"
                                />
                            )
                        ) : null}

                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: theme.third }]}>
                                {isAdmin ? "Welcome Boss!" : `Welcome to ${businessName}!`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* הודעה קופצת (Jumping Msg) בתוך אקורדיון */}
                <View style={styles.accordionOverlay}>
                    <SimpleAccordion title="הודעה מהעסק">
                        <JumpingMsg />
                    </SimpleAccordion>
                </View>
            </View>

            {/* ---------------- Main Content ---------------- */}
            <View style={styles.innerContent}>

                {/* כפתור ראשי להזמנת תור */}
                <View style={styles.buttonWrap}>
                    <TouchableOpacity
                        style={[
                            styles.bookBtn,
                            {
                                backgroundColor: theme.secondary,
                                borderColor: theme.third,
                            },
                        ]}
                        onPress={handleBookAppointment}
                    >
                        <Text style={[styles.bookBtnText, { color: theme.third }]}>
                            להזמנת תור
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* כפתור מהיר (אם נדרש בנוסף לכפתור הראשי) */}
                <QuickBookButton />

                <View style={[styles.hr, { backgroundColor: theme.third }]} />

                {/* גלריה */}
                <WorksGallery images={gallerySources} />

                <View style={[styles.hr, { backgroundColor: theme.third }]} />

                {/* חלק אודות */}
                <BannerWithAbout
                    mainImage={aboutImageSource}
                    title={aboutTitle}
                    description={aboutDescription}
                />
            </View>

            <View style={[styles.hr, { backgroundColor: theme.third }]} />

            {/* ---------------- Contact Section ---------------- */}
            <ContactInfoSection
                phone={phoneForDisplay}
                address={addressFromServer}
                onPressCall={() => phoneDigits && openLink(`tel:${phoneDigits}`)}
                onPressNavigate={() =>
                    openLink(`https://waze.com/ul?q=${encodedAddress}`)
                }
                backgroundImageUrl={business.banner3}
            />

            {/* ---------------- Footer Section ---------------- */}
            {/* הערה: כאן הנחתי שהקישורים מגיעים מאובייקט links בתוך businessData.
         אם הם נמצאים בשורש האובייקט (למשל business.facebook), יש להתאים את הגישה.
      */}
            <FooterSection
                onPressTiktok={() => openLink(business.links?.tiktok || "https://www.tiktok.com/")}
                onPressFacebook={() => openLink(business.links?.facebook || "https://www.facebook.com/")}
                onPressInstagram={() => openLink(business.links?.instagram || "https://www.instagram.com/")}
                onPressWhatsapp={() =>
                    openLink(
                        business.links?.whatsapp ||
                        (phoneDigits ? `https://wa.me/${phoneDigits}` : "")
                    )
                }
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    heroSection: {
        width: "100%",
        position: "relative",
    },
    accordionOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bannerWrap: {
        width: "100%",
        height: 240,
        position: "relative",
        overflow: "hidden",
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    bannerShadow: {
        width: "100%",
        borderRadius: 18, // שים לב: זה משפיע על הצל, ה-Radius האמיתי הוא ב-Wrap
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    bannerMedia: {
        width: "100%",
        height: "100%",
    },
    titleContainer: {
        position: "absolute",
        top: 60, // הורדתי קצת כדי שלא יתנגש עם האקורדיון
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    title: {
        fontWeight: "bold",
        fontSize: 24,
        textAlign: "center",
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    innerContent: {
        paddingHorizontal: 16,
        gap: 16,
        marginTop: 16,
        marginBottom: 16,
    },
    buttonWrap: {
        marginTop: 16,
        width: "100%",
        alignItems: "center",
    },
    bookBtn: {
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    bookBtnText: {
        fontSize: 18,
        fontWeight: "600",
    },
    hr: {
        height: 1,
        marginTop: 8,
        marginBottom: 8,
        opacity: 0.2,
        width: "80%", // הקו לא חייב להיות על כל הרוחב
        alignSelf: "center",
    },
});
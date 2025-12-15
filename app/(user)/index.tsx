import BannerWithAbout from "@/components/BannerWithAbout";
import ContactInfoSection from "@/components/ContactInfoSection";
import FooterSection from "@/components/FooterSection";
import SimpleAccordion from "@/components/SimpleAccordion";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    I18nManager,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import JumpingMsg from "../../components/jumpingMsg";
import WorksGallery from "../../components/WorksGallery";
import { useAuth } from "../../contexts/AuthContext";

console.log("RTL?", I18nManager.isRTL);


export default function Index() {
    const router = useRouter();
    const [expanded, setExpanded] = useState(true);
    const { businessData, colors } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    const business: any = businessData || {};

    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    useEffect(() => {
        setExpanded(true);
    }, []);

    const handleBookAppointment = () => {
        router.push("/(user)/orderTor");
    };

    /** גלריה – מהשרת בלבד */
    const gallerySources = useMemo(() => {
        const fromServer: string[] = business.portfolio || [];
        return fromServer.map((url) => ({ uri: url }));
    }, [business.portfolio]);

    const businessName = business.name || "TorimAL";

    /** באנר ראשי (יכול להיות וידאו או תמונה מהשרת בלבד) */
    const bannerUrl: string | undefined = business.banner;
    const isVideoBanner =
        typeof bannerUrl === "string" &&
        /\.(mp4|mov|mkv|webm|avi)$/i.test(bannerUrl);

    /** טלפון */
    const phoneRaw: string = business.phone || "";
    const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
    const phoneForDisplay = phoneRaw || "לא צוין";

    /** כתובת */
    const addressFromServer: string = business.address || "";

    const encodedAddress = encodeURIComponent(addressFromServer);

    /** עלינו */
    const aboutTitle = business.aboutUs ? "קצת עלינו" : "קצת על הסטודיו";
    const aboutDescription = business.aboutUs || "";

    const aboutImageSource = business.banner2
        ? { uri: business.banner2 }
        : undefined;

    return (
        <ScrollView
            style={[styles.root, { backgroundColor: colorsSafe.secondary }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* באנר עליון */}
            <View style={styles.heroSection}>
                <View
                    style={[
                        styles.bannerShadow,
                        { shadowColor: colorsSafe.primary },
                    ]}
                >
                    <View style={styles.bannerWrap}>
                        {bannerUrl ? (
                            isVideoBanner ? (
                                <Video
                                    source={{ uri: bannerUrl }}
                                    style={styles.bannerVideo}
                                    resizeMode={ResizeMode.COVER}
                                    isMuted
                                    shouldPlay
                                    isLooping
                                />
                            ) : (
                                <Image
                                    source={{ uri: bannerUrl }}
                                    style={styles.bannerVideo}
                                    resizeMode="cover"
                                />
                            )
                        ) : null}

                        <View style={styles.titleContainer}>
                            <Text
                                style={[
                                    styles.title,
                                    { color: colorsSafe.third },
                                ]}
                            >
                                {isAdmin
                                    ? "Welcome Boss!"
                                    : `Welcome to ${businessName}!`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* הודעה מהעסק */}
                <View style={styles.accordionOverlay}>
                    <SimpleAccordion title="הודעה מהעסק">
                        <JumpingMsg />
                    </SimpleAccordion>
                </View>
            </View>

            {/* המשך התוכן */}
            <View style={styles.innerContent}>
                {/* כפתור הזמנה */}
                <View style={styles.buttonWrap}>
                    <TouchableOpacity
                        style={[
                            styles.bookBtn,
                            {
                                backgroundColor: colorsSafe.secondary,
                                borderColor: colorsSafe.third,
                            },
                        ]}
                        onPress={handleBookAppointment}
                    >
                        <Text
                            style={[
                                styles.bookBtnText,
                                { color: colorsSafe.third },
                            ]}
                        >
                            להזמנת תור
                        </Text>
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.hr,
                        { backgroundColor: colorsSafe.third, opacity: 0.2 },
                    ]}
                />

                {/* גלריה */}
                <WorksGallery images={gallerySources} />

                <View
                    style={[
                        styles.hr,
                        { backgroundColor: colorsSafe.third, opacity: 0.2 },
                    ]}
                />

                {/* עלינו */}
                <BannerWithAbout
                    mainImage={aboutImageSource}
                    title={aboutTitle}
                    description={aboutDescription}
                />
            </View>

            <View
                style={[
                    styles.hr,
                    { backgroundColor: colorsSafe.third, opacity: 0.2 },
                ]}
            />

            {/* פרטי קשר */}
            <ContactInfoSection
                phone={phoneForDisplay}
                address={addressFromServer}
                onPressCall={() =>
                    phoneDigits && Linking.openURL(`tel:${phoneDigits}`)
                }
                onPressNavigate={() =>
                    Linking.openURL(`https://waze.com/ul?q=${encodedAddress}`)
                }
                backgroundImageUrl={business.banner3}
            />



            {/* פוטר */}
            <FooterSection
                onPressTiktok={() =>
                    Linking.openURL("https://www.tiktok.com/")
                }
                onPressFacebook={() =>
                    Linking.openURL("https://www.facebook.com/")
                }
                onPressInstagram={() =>
                    Linking.openURL("https://www.instagram.com/")
                }
                onPressWhatsapp={() =>
                    Linking.openURL("https://wa.me/972527404249")
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
        borderRadius: 18,
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    bannerVideo: {
        width: "100%",
        height: "100%",
    },
    titleContainer: {
        position: "absolute",
        top: 50,
        width: "100%",
        alignItems: "center",
    },
    title: {
        fontWeight: "bold",
        fontSize: 24,
        textAlign: "center",
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
    },
    bookBtnText: {
        fontSize: 18,
        fontWeight: "600",
    },
    hr: {
        height: 1,
        marginTop: 1,
        marginBottom: 1,
    },
});

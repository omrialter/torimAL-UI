import BannerWithAbout from "@/components/BannerWithAbout";
import ContactInfoSection from "@/components/ContactInfoSection";
import FooterSection from "@/components/FooterSection";
import SimpleAccordion from "@/components/SimpleAccordion";
import VideoBanner from "@/components/VideoBanner";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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

export default function Index() {
    const router = useRouter();
    const [expanded, setExpanded] = useState(true);
    const { businessData, colors } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    useEffect(() => {
        setExpanded(true);
    }, []);

    const handleBookAppointment = () => {
        router.push("/(user)/orderTor");
    };

    const images = [
        require("@/assets/images/nails1.png"),
        require("@/assets/images/nails2.jpg"),
        require("@/assets/images/nails3.jpg"),
        require("@/assets/images/nails4.jpg"),
        require("@/assets/images/nails5.jpg"),
        require("@/assets/images/nails6.jpg"),
    ];

    const businessName = businessData?.name || "torimAL";

    return (
        <ScrollView
            style={[styles.root, { backgroundColor: colors.secondary }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* אזור ראש העמוד: באנר + הודעה מהעסק אחד על השני */}
            <View style={styles.heroSection}>
                {/* הבאנר ברקע */}
                <View
                    style={[
                        styles.bannerShadow,
                        { shadowColor: colors.primary },
                    ]}
                >
                    <View style={styles.bannerWrap}>
                        <VideoBanner
                            source={require("@/assets/videos/bannerVideo.mp4")}
                            enableCaching={false}
                            zIndex={0}
                        />

                        <View style={styles.titleContainer}>
                            <Text
                                style={[
                                    styles.title,
                                    { color: colors.third },
                                ]}
                            >
                                {isAdmin
                                    ? "Welcome Boss!"
                                    : `Welcome to ${businessName}!`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* האקורדיון יושב מעל הבאנר באותה נקודה */}
                <View style={styles.accordionOverlay}>
                    <SimpleAccordion title="הודעה מהעסק">
                        <JumpingMsg />
                    </SimpleAccordion>
                </View>
            </View>

            {/* שאר התוכן של המסך */}
            <View style={styles.innerContent}>
                <View style={styles.buttonWrap}>
                    <TouchableOpacity
                        style={[
                            styles.bookBtn,
                            {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                            },
                        ]}
                        onPress={handleBookAppointment}
                    >
                        <Text
                            style={[
                                styles.bookBtnText,
                                { color: colors.third },
                            ]}
                        >
                            להזמנת תור
                        </Text>
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.hr,
                        { backgroundColor: colors.third, opacity: 0.2 },
                    ]}
                />

                <WorksGallery images={images} />

                <View
                    style={[
                        styles.hr,
                        { backgroundColor: colors.third, opacity: 0.2 },
                    ]}
                />

                <BannerWithAbout
                    mainImage={require("@/assets/images/banner2.jpg")}
                    title="קצת על הסטודיו"
                    description="כאן תוכלי לכתוב כמה מילים על העסק – ניסיון, סגנון, מה מיוחד אצלך ועוד."
                />
            </View>

            <View
                style={[
                    styles.hr,
                    { backgroundColor: colors.third, opacity: 0.2 },
                ]}
            />

            <ContactInfoSection
                phone="054-3010576"
                address="ספיר 15 שערי תקווה"
                onPressCall={() => Linking.openURL("tel:0543010576")}
                onPressNavigate={() =>
                    Linking.openURL(
                        "https://waze.com/ul?q=ספיר%2015%20שערי%20תקווה"
                    )
                }
            />

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
        backgroundColor: "#f9ebf2ff", // fallback, יידרס ע"י colors.secondary
    },

    scrollContent: {
        paddingBottom: 24,
    },

    // כל הראש – באנר + אקורדיון מעליו
    heroSection: {
        width: "100%",
        position: "relative", // חשוב בשביל ה־absolute של האקורדיון
    },

    // האקורדיון יושב מעל הבאנר בדיוק באותה נקודה
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

    titleContainer: {
        position: "absolute",
        top: 50,
        width: "100%",
        alignItems: "center",
        zIndex: 2,
    },

    title: {
        fontWeight: "bold",
        color: "white", // יידרס ע"י colors.third
        fontSize: 24,
        marginTop: 4,
        textAlign: "center",
    },

    // כל מה שבא אחרי הראש (כפתור, גלריה, באנר שני)
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
        borderColor: "black", // יידרס ע"י colors.primary
        backgroundColor: "white", // יידרס ע"י colors.primary
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },

    bookBtnText: {
        color: "black", // יידרס ע"י colors.third
        fontSize: 18,
        fontWeight: "600",
    },

    hr: {
        height: 1,
        backgroundColor: "white",
        marginTop: 1,
        marginBottom: 1,
    },
});

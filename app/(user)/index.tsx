import BannerWithAbout from "@/components/BannerWithAbout";
import ContactInfoSection from "@/components/ContactInfoSection";
import FooterSection from "@/components/FooterSection";
import SimpleAccordion from "@/components/SimpleAccordion";
import VideoBanner from "@/components/VideoBanner";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useRouter } from 'expo-router';
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import JumpingMsg from "../../components/jumpingMsg";
import WorksGallery from "../../components/WorksGallery";
import { useAuth } from "../../contexts/AuthContext";



export default function Index() {
    const router = useRouter();
    const [expanded, setExpanded] = useState(true);
    const handlePress = () => setExpanded(!expanded);
    const { businessData } = useBusinessDataContext();
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

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* אזור ראש העמוד: באנר + הודעה מהעסק אחד על השני */}
            <View style={styles.heroSection}>
                {/* הבאנר ברקע */}
                <View style={styles.bannerShadow}>
                    <View style={styles.bannerWrap}>
                        <VideoBanner
                            source={require("@/assets/videos/bannerVideo.mp4")}
                            enableCaching={false}
                            zIndex={0}
                        />

                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>
                                {isAdmin ? "Welcome Boss!" : "Welcome to torimAL!"}
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
                    <TouchableOpacity style={styles.bookBtn} onPress={handleBookAppointment}>
                        <Text style={styles.bookBtnText}>להזמנת תור</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.hr} />

                <WorksGallery images={images} />

                <View style={styles.hr} />

                <BannerWithAbout

                    mainImage={require("@/assets/images/banner2.jpg")}
                    title="קצת על הסטודיו"
                    description="כאן תוכלי לכתוב כמה מילים על העסק – ניסיון, סגנון, מה מיוחד אצלך ועוד."
                />
            </View>

            <View style={styles.hr} />




            <ContactInfoSection
                phone="054-3010576"
                address="ספיר 15 שערי תקווה"
                onPressCall={() => Linking.openURL("tel:0543010576")}
                onPressNavigate={() => Linking.openURL("https://waze.com/ul?q=ספיר%2015%20שערי%20תקווה")}
            />


            <FooterSection
                onPressTiktok={() => Linking.openURL("https://www.tiktok.com/")}
                onPressFacebook={() => Linking.openURL("https://www.facebook.com/")}
                onPressInstagram={() => Linking.openURL("https://www.instagram.com/")}
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
        backgroundColor: "#f9ebf2ff",
    },

    scrollContent: {
        paddingBottom: 24,
    },

    // כל הראש – באנר + אקורדיון מעליו
    heroSection: {
        width: "100%",
        position: "relative",   // חשוב בשביל ה־absolute של האקורדיון
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
        color: "white",
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
        borderColor: "black",
        backgroundColor: "white",
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },

    bookBtnText: {
        color: "black",
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

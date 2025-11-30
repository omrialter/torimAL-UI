import SimpleAccordion from "@/components/SimpleAccordion";
import VideoBanner from "@/components/VideoBanner";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useRouter } from 'expo-router';
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
        <View style={styles.root}>

            {/* 1) הודעה מהעסק – צמוד ל־Header, בשכבה עליונה */}
            <View style={styles.accordionOverlay}>
                <SimpleAccordion title="הודעה מהעסק">
                    <JumpingMsg />
                </SimpleAccordion>
            </View>

            {/* 2+3) תוכן העמוד: באנר + כפתור מתחתיו */}
            <View style={styles.content}>

                {/* 2) הבאנר עם Welcome */}
                {/* 2) הבאנר עם Welcome + צל עדין */}
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


                {/* 3) כפתור הזמנת תור */}
                <View style={styles.buttonWrap}>
                    <TouchableOpacity style={styles.bookBtn} onPress={handleBookAppointment}>
                        <Text style={styles.bookBtnText}>להזמנת תור</Text>
                    </TouchableOpacity>
                </View>

                <WorksGallery images={images} />


            </View>
        </View>
    );
}

const ACCORDION_HEADER_HEIGHT = 48; // אפשר לשחק עם זה אם יש חפיפה קטנה

const styles = StyleSheet.create({
    root: {
        flex: 1,
        position: "relative",
    },

    // האקורדיון צף מעל התוכן, אבל עדיין זז יחד עם העמוד בגלילה
    accordionOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },

    // כל שאר התוכן מתחיל קצת מתחת לאקורדיון
    content: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingBottom: 24,
        gap: 16,
        height: 500
    },

    bannerWrap: {
        width: "100%",
        height: 240,          // 👈 גובה מפורש לבאנר
        position: "relative",
        overflow: "hidden",
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        backgroundColor: "#000",
    },
    bannerShadow: {
        width: "100%",
        borderRadius: 18,
        // 👇 צל עדין
        shadowColor: "#000",
        shadowOpacity: 0.28,   // היה 0.18 — עכשיו יותר מודגש
        shadowRadius: 12,      // היה 8 — עכשיו רחב יותר
        shadowOffset: { width: 0, height: 6 }, // קצת יותר עומק
        elevation: 10,         // לאנדרואיד (היה 6)
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

    buttonWrap: {
        marginTop: 16,
        width: "100%",
        alignItems: "center",
    },

    bookBtn: {
        backgroundColor: "#2563eb",
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },

    bookBtnText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
});

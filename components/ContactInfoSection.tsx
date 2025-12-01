import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ImageBackground,
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";

// לאנדרואיד – הפעלת LayoutAnimation
if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
    phone: string;
    address: string;
    onPressCall?: () => void;
    onPressNavigate?: () => void;
}

export default function ContactInfoSection({
    phone,
    address,
    onPressCall,
    onPressNavigate,
}: Props) {
    const [showDetails, setShowDetails] = useState(false);

    const toggleDetails = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDetails((prev) => !prev);
    };

    return (
        <ImageBackground
            source={
                showDetails ? undefined : require("@/assets/images/banner3.jpg")
            }
            style={[
                styles.card,
                !showDetails && styles.cardWithImage,
            ]}
            imageStyle={styles.backgroundImage}
        >
            {/* ---- טקסטים (ימינה למעלה) ---- */}
            {showDetails && (
                <View style={styles.topContent}>
                    <View style={styles.row}>
                        <Ionicons name="call-outline" size={18} color="#111827" />
                        <Text style={styles.text}>טלפון: {phone}</Text>
                    </View>

                    <View style={[styles.row, { marginTop: 6 }]}>
                        <Ionicons name="person-outline" size={18} color="#111827" />
                        <Text style={styles.text}>כתובת: {address}</Text>
                    </View>
                </View>
            )}

            {/* ---- כפתורים בתחתית ---- */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.pillButton} onPress={onPressNavigate}>
                    <Text style={styles.pillText}>ניווט בעזרת Waze</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pillButton} onPress={toggleDetails}>
                    <Text style={styles.pillText}>
                        {showDetails ? "הצג תמונה" : "כתובת ויצירת קשר"}
                    </Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 24,
        marginHorizontal: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 32,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#ffffff",
        minHeight: 200,
    },
    // במצב תמונה — גבוה יותר
    cardWithImage: {
        minHeight: 320,
    },
    backgroundImage: {
        borderRadius: 32,
        opacity: 0.85,
    },

    /* ----- טקסטים נצמדים למעלה ----- */
    topContent: {
        alignItems: "flex-end",   // טקסט לימין
        justifyContent: "flex-start",
        marginBottom: 20,         // רווח קטן מהכפתורים
    },

    row: {
        flexDirection: "row-reverse",
        alignItems: "center",
    },

    text: {
        fontSize: 15,
        color: "#111827",
        marginHorizontal: 6,
    },

    /* ----- כפתורים בתחתית ----- */
    bottomButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: "auto",    // ⭐ מבטיח שזה תמיד בתחתית!
    },

    pillButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: "white",
        alignItems: "center",
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: "#ececec",
    },

    pillText: {
        fontSize: 13,
        color: "#111827",
    },
});

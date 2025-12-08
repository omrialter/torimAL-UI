import { useState } from "react";
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Props {
    mainImage?: ImageSourcePropType; // עכשיו אופציונלי ✔
    title?: string;
    description?: string;
}

export default function BannerWithAbout({
    mainImage,
    title = "קצת עלינו",
    description = "ברוכים הבאים לעסק שלנו! כאן אפשר לכתוב כמה שורות שמספרות עלייך, על הסטודיו, ועל מה שמייחד אתכם.",
}: Props) {
    const [showAbout, setShowAbout] = useState(false);

    const hasImage = Boolean(mainImage);

    return (
        <View style={styles.container}>
            {!showAbout ? (
                <>
                    {/* תמונה מוצגת רק אם קיימת */}
                    {hasImage && (
                        <Image
                            source={mainImage!}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    )}

                    {/* כפתור "קצת עלינו" */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setShowAbout(true)}
                    >
                        <Text style={styles.buttonText}>קצת עלינו</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.aboutWrapper}>
                    <View style={styles.aboutBox}>
                        <Text style={styles.aboutTitle}>{title}</Text>
                        <Text style={styles.aboutText}>{description}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowAbout(false)}
                    >
                        <Text style={styles.buttonText2}>חזרה</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 8,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "white",
    },

    image: {
        width: "100%",
        height: 220,
    },

    button: {
        borderWidth: 1,
        borderColor: "black",
        backgroundColor: "white",
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        alignSelf: "center",
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
    },

    buttonText: {
        color: "black",
        fontSize: 18,
        fontWeight: "600",
    },

    buttonText2: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },

    aboutWrapper: {
        backgroundColor: "black",
    },

    aboutBox: {
        backgroundColor: "white",
        padding: 20,
        minHeight: 180,
        justifyContent: "center",
        alignItems: "center",
    },

    aboutTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },

    aboutText: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 24,
        color: "black",
    },

    backButton: {
        borderWidth: 1,
        borderColor: "black",
        backgroundColor: "black",
        paddingVertical: 10,
        alignItems: "center",
    },
});

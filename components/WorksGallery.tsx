import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

type WorksGalleryProps = {
    images: any[];
    title?: string;
};

export default function WorksGallery({
    images,
    title = "גלריית עבודות",
}: WorksGalleryProps) {
    if (!images || images.length === 0) return null;

    // הפיכת סדר התמונות (ימין → שמאל)
    const reversedImages = [...images].reverse();

    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>{title}</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {reversedImages.map((img, index) => (
                    <View key={index} style={styles.imageWrapper}>
                        <Image source={img} style={styles.image} resizeMode="cover" />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginTop: 24,
    },

    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
        textAlign: "right",
        paddingRight: 16,
    },

    scrollContent: {
        paddingHorizontal: 16,
        flexDirection: "row",
    },

    imageWrapper: {
        marginRight: 12,

        // פינות עגולות
        borderRadius: 18,
        overflow: "hidden",

        // מסגרת עדינה
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.15)",
        backgroundColor: "#ffffff",

        // ⭐ צל כמו של הבאנר ⭐
        shadowColor: "#000",
        shadowOpacity: 0.20,        // קצת יותר מודגש
        shadowRadius: 12,           // גדול ורך כמו בבאנר
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,               // לאנדרואיד
    },

    image: {
        width: 220,
        height: 140,
    },
});

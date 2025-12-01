import React, { useRef } from "react";
import { Image, ScrollView, ScrollView as ScrollViewType, StyleSheet, Text, View } from "react-native";

type WorksGalleryProps = {
    images: any[];
    title?: string;
};

export default function WorksGallery({
    images,
    title = "גלריית עבודות",
}: WorksGalleryProps) {
    if (!images || images.length === 0) return null;

    // 👈 הפיכת סדר התמונות – כמו שאהבת
    const reversedImages = [...images].reverse();

    // ref ל-ScrollView כדי שנוכל לגלול לסוף כשנטען
    const scrollRef = useRef<ScrollViewType | null>(null);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>{title}</Text>

            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                // 👇 ברגע שהתוכן נטען – גוללים לסוף (למצב שאתה אוהב)
                onContentSizeChange={() => {
                    scrollRef.current?.scrollToEnd({ animated: false });
                }}
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
        marginTop: 4,

    },

    title: {
        fontSize: 24,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
        textAlign: "right",
        paddingRight: 16,

    },

    // כיוון רגיל, לא נוגעים בו
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
        borderWidth: 3,
        borderColor: "white",
        backgroundColor: "#ffffff",

        // ⭐ צל כמו של הבאנר ⭐
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },

    image: {
        width: 220,
        height: 140,
    },
});

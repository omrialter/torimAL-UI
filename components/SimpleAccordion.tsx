import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type SimpleAccordionProps = {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
};

export default function SimpleAccordion({
    title,
    children,
    defaultExpanded = false,
}: SimpleAccordionProps) {
    const [open, setOpen] = useState(defaultExpanded);
    const [measuredHeight, setMeasuredHeight] = useState(0);

    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

    // פתיחה אוטומטית אחרי שנייה
    useEffect(() => {
        const timer = setTimeout(() => setOpen(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    // אחרי שנמדד גובה התוכן – אם צריך, נעדכן את הערך ההתחלתי
    useEffect(() => {
        if (!measuredHeight) return;
        if (defaultExpanded) {
            heightAnim.setValue(measuredHeight);
        }
    }, [measuredHeight, defaultExpanded, heightAnim]);

    // אנימציה בפתיחה/סגירה
    useEffect(() => {
        if (!measuredHeight) return;

        Animated.timing(heightAnim, {
            toValue: open ? measuredHeight : 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();

        Animated.timing(rotateAnim, {
            toValue: open ? 1 : 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [open, measuredHeight, heightAnim, rotateAnim]);

    const onContentLayout = (e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        if (h !== measuredHeight) setMeasuredHeight(h);
    };

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    // התוכן (משמש גם למדידה וגם להצגה)
    const Content = (
        <View style={styles.contentInner}>
            {children}
            <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeButton}
                activeOpacity={0.8}
            >
                <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <Pressable style={styles.header} onPress={() => setOpen(o => !o)}>
                <Animated.Text style={[styles.arrow, { transform: [{ rotate }] }]}>
                    ▼
                </Animated.Text>
                <Text style={styles.title}>{title}</Text>
            </Pressable>

            {/* תוכן עם רדיוסים */}
            <View style={styles.roundedContentContainer}>
                {/* 👇 View נסתר למדידת גובה מלא */}
                <View style={styles.hiddenMeasure} onLayout={onContentLayout}>
                    {Content}
                </View>

                {/* 👇 מה שנראה בפועל – עם גובה מונפש */}
                <Animated.View style={{ height: heightAnim, overflow: "hidden" }}>
                    {Content}
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: "visible",
        width: "100%",
        zIndex: 50,
    },
    header: {
        backgroundColor: "#211f1fff",
        paddingHorizontal: 16,
        paddingVertical: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomLeftRadius: 32,
    },
    title: {
        color: "#808080",
        fontSize: 18,
        fontWeight: "600",
    },
    arrow: {
        fontSize: 24,
        color: "#808080",
        marginLeft: 8,
    },
    roundedContentContainer: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: "hidden",
    },

    // רק למדידה – לא נראה על המסך
    hiddenMeasure: {
        position: "absolute",
        opacity: 0,
        zIndex: -1,
        left: 0,
        right: 0,
        pointerEvents: "none",
    },

    contentInner: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: "center",
        width: "100%",
    },
    closeButton: {
        marginTop: 16,
        backgroundColor: "#211f1fff",
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    closeButtonText: {
        color: "#808080",
        fontWeight: "600",
    },
});

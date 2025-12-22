import { useBusinessDataContext } from "@/contexts/BusinessDataContext"; // או הנתיב הנכון שלך
import { useUserDataContext } from "@/contexts/UserDataContext";
import { Link, usePathname } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Animated,
    Button,
    Dimensions,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

type RenderProp = (toggleDrawer: () => void) => React.ReactNode;

type Props = {
    children: RenderProp;
    style?: StyleProp<ViewStyle>;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.7);

export default function Menu({ children, style }: Props) {
    const pathname = usePathname();
    const isAuthScreen = pathname === "/login" || pathname === "/signup";

    const { userData } = useUserDataContext();
    const { logout, isAdmin } = useAuth();

    // ✅ תיקון 1: הקריאה להוק חייבת להיות כאן, בתוך הקומפוננטה
    const { businessData } = useBusinessDataContext();

    // שליפת הצבע מהמידע שהגיע (עם גיבוי לצבע זהב אם הנתונים טרם נטענו)
    const primaryColor = businessData?.business_colors?.primary || "#FFD700";

    const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
    const [open, setOpen] = useState(false);

    const animateTo = useCallback(
        (to: number) => {
            Animated.timing(translateX, {
                toValue: to,
                duration: 250,
                useNativeDriver: true,
            }).start();
        },
        [translateX]
    );

    const openDrawer = useCallback(() => {
        if (isAuthScreen) return;
        setOpen(true);
        animateTo(0);
    }, [animateTo, isAuthScreen]);

    const closeDrawer = useCallback(() => {
        animateTo(DRAWER_WIDTH);
        setTimeout(() => setOpen(false), 250);
    }, [animateTo]);

    const toggleDrawer = useCallback(() => {
        if (isAuthScreen) return;
        open ? closeDrawer() : openDrawer();
    }, [open, openDrawer, closeDrawer, isAuthScreen]);

    const content = useMemo(() => children(toggleDrawer), [children, toggleDrawer]);

    // ✅ תיקון 2: יצירת סטייל דינמי שמשתמש במשתנה
    const dynamicLinkStyle = [styles.adminLink, { color: primaryColor }];

    return (
        <View style={[{ flex: 1 }, style]}>
            {!isAuthScreen && (
                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX }] },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={closeDrawer}
                            accessibilityRole="button"
                            accessibilityLabel="Close menu"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.closeBtn}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>

                        <Text style={styles.section}>
                            ברוך הבא, {userData?.name}
                        </Text>
                    </View>

                    <View style={{ marginTop: 20 }}>
                        <Link href="/" style={styles.link} onPress={closeDrawer}>
                            🏠 בית
                        </Link>
                        <Link href="/orderTor" style={styles.link} onPress={closeDrawer}>
                            זימון תור
                        </Link>
                        <Link href="/torList" style={styles.link} onPress={closeDrawer}>
                            התורים שלך
                        </Link>
                        <Link href="/" style={styles.link} onPress={closeDrawer}>
                            התראות
                        </Link>

                        {isAdmin && (
                            <View style={styles.adminSection}>
                                <View style={styles.divider} />

                                <Text style={styles.adminHeader}>ניהול מערכת</Text>

                                {/* שימוש בסטייל הדינמי */}
                                <Link href="/admin/bi_page" style={dynamicLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>📊</Text> נתוני עסק
                                </Link>
                                <Link href="/admin/torim" style={dynamicLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>📅</Text> ניהול תורים
                                </Link>
                                <Link href="/admin/settings" style={dynamicLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>⚙️</Text> הגדרות
                                </Link>
                            </View>
                        )}
                    </View>

                    <View style={styles.logoutBtn}>
                        {/* שימוש בצבע גם לכפתור */}
                        <Button title="Log out" onPress={() => logout()} color={primaryColor} />
                    </View>
                </Animated.View>
            )}

            {open && !isAuthScreen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={closeDrawer}
                />
            )}

            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    drawer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: DRAWER_WIDTH,
        backgroundColor: "#111",
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 999,
        alignItems: "stretch",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    section: {
        flex: 1,
        color: "#888",
        fontSize: 14,
        letterSpacing: 1,
        textTransform: "uppercase",
        textAlign: "right",
    },
    closeBtn: {
        marginLeft: 12,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    closeText: {
        color: "#fff",
        fontSize: 20,
        lineHeight: 20,
    },
    link: {
        color: "#fff",
        fontSize: 18,
        marginVertical: 12,
        textAlign: "right",
    },
    adminSection: {
        marginTop: 20,
        paddingHorizontal: 0,
    },
    divider: {
        height: 1,
        backgroundColor: "#333",
        marginVertical: 15,
        width: '100%',
    },
    adminHeader: {
        color: "#8E8E93",
        fontSize: 12,
        marginBottom: 10,
        textAlign: "right",
        fontWeight: "600",
        letterSpacing: 1,
        opacity: 0.8,
    },
    // ✅ תיקון 3: הסרנו את הצבע מפה כי הוא מגיע דינמית
    adminLink: {
        fontSize: 16,
        marginVertical: 10,
        textAlign: "right",
        fontWeight: "500",
    },
    adminIcon: {
        fontSize: 14,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 5,
    },
    logoutBtn: {
        flex: 1,
        justifyContent: "space-evenly",
    },
});
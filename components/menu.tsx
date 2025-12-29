// components/menu.tsx
import { Link, usePathname, useRouter } from "expo-router";
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

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useUserDataContext } from "@/contexts/UserDataContext";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type RenderProp = (toggleDrawer: () => void) => React.ReactNode;

type Props = {
    children: RenderProp;
    style?: StyleProp<ViewStyle>;
};

// הגדרת טיפוס מינימלי למשתמש כדי למנוע שגיאות TS
type MenuUser = {
    name?: string;
    [key: string]: any;
};

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get("window").width;
// רוחב התפריט (70% מהמסך)
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.7);

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function Menu({ children, style }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    // בדיקה האם אנחנו במסכי אותנטיקציה (שם אין תפריט)
    const isAuthScreen = pathname === "/login" || pathname === "/signup";

    const { userData } = useUserDataContext();
    const { logout, isAdmin } = useAuth();

    // שימוש ב-colors שכבר חולץ ב-Hook (פותר את שגיאת ה-Types)
    const { colors } = useBusinessDataContext();
    const primaryColor = colors.primary;

    // אנימציה
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
        // מחכים שהאנימציה תסתיים לפני שמשנים את ה-State
        setTimeout(() => setOpen(false), 250);
    }, [animateTo]);

    const toggleDrawer = useCallback(() => {
        if (isAuthScreen) return;
        open ? closeDrawer() : openDrawer();
    }, [open, openDrawer, closeDrawer, isAuthScreen]);

    // Render Props
    const content = useMemo(() => children(toggleDrawer), [children, toggleDrawer]);

    // טיפול ביציאה מהמערכת
    const handleLogout = async () => {
        await logout();
        closeDrawer();
        // router.replace("/login"); // לרוב ה-AuthContext כבר יזרוק אותנו החוצה, אבל ליתר ביטחון
    };

    // עיצוב דינמי ללינקים של האדמין
    const dynamicAdminLinkStyle = useMemo(() => {
        return [styles.adminLink, { color: primaryColor }];
    }, [primaryColor]);

    // המרת המידע לטיפוס המוכר כדי למנוע שגיאות
    const user = userData as MenuUser | null;

    return (
        <View style={[{ flex: 1 }, style]}>
            {!isAuthScreen && (
                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX }] },
                    ]}
                >
                    {/* --- Header Row (Close + Name) --- */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={closeDrawer}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.closeBtn}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>

                        <Text style={styles.section}>
                            {user?.name ? `ברוך הבא, ${user.name}` : "ברוך הבא"}
                        </Text>
                    </View>

                    {/* --- Navigation Links --- */}
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
                        <Link href="/notifications" style={styles.link} onPress={closeDrawer}>
                            התראות
                        </Link>

                        {/* --- Admin Section --- */}
                        {isAdmin && (
                            <View style={styles.adminSection}>
                                <View style={styles.divider} />
                                <Text style={styles.adminHeader}>ניהול מערכת</Text>

                                <Link href="/admin/bi_page" style={dynamicAdminLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>📊</Text> נתוני עסק
                                </Link>
                                <Link href="/admin/torim" style={dynamicAdminLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>📅</Text> ניהול תורים
                                </Link>
                                <Link href="/admin/settings" style={dynamicAdminLinkStyle} onPress={closeDrawer}>
                                    <Text style={styles.adminIcon}>⚙️</Text> הגדרות
                                </Link>
                            </View>
                        )}
                    </View>

                    {/* --- Logout Button --- */}
                    <View style={styles.logoutContainer}>
                        <Button
                            title="התנתק"
                            onPress={handleLogout}
                            color={primaryColor}
                        />
                    </View>
                </Animated.View>
            )}

            {/* --- Overlay (Click outside to close) --- */}
            {open && !isAuthScreen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={closeDrawer}
                />
            )}

            {/* --- Main Content Injection --- */}
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
        // צל להפרדה מהרקע
        shadowColor: "#000",
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
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
        // textTransform: "uppercase", // לא תמיד נראה טוב בעברית
        textAlign: "right",
        writingDirection: "rtl", // חשוב לעברית
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
        writingDirection: "rtl",
    },
    adminSection: {
        marginTop: 20,
        paddingHorizontal: 0,
    },
    divider: {
        height: 1,
        backgroundColor: "#333",
        marginVertical: 15,
        width: "100%",
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
    adminLink: {
        fontSize: 16,
        marginVertical: 10,
        textAlign: "right",
        fontWeight: "500",
        writingDirection: "rtl",
    },
    adminIcon: {
        fontSize: 14,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)", // קצת יותר כהה
        zIndex: 5,
    },
    logoutContainer: {
        marginTop: "auto", // דוחף את הכפתור לתחתית
        marginBottom: 40,  // מרווח מהקצה התחתון
    },
});
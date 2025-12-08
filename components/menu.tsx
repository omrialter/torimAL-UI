// components/CustomDrawer.tsx
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

    // 🛑 מסכים שבהם אין תפריט
    const isAuthScreen = pathname === "/login" || pathname === "/signup";

    const { userData } = useUserDataContext();
    const { logout, isAdmin } = useAuth();

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
        if (isAuthScreen) return; // 🔒 אל תפתח בעמודי לוגין/סיינאפ
        setOpen(true);
        animateTo(0);
    }, [animateTo, isAuthScreen]);

    const closeDrawer = useCallback(() => {
        animateTo(DRAWER_WIDTH);
        setTimeout(() => setOpen(false), 250);
    }, [animateTo]);

    const toggleDrawer = useCallback(() => {
        if (isAuthScreen) return; // 🔒 חסימה גם ב-toggle
        open ? closeDrawer() : openDrawer();
    }, [open, openDrawer, closeDrawer, isAuthScreen]);

    const content = useMemo(() => children(toggleDrawer), [children, toggleDrawer]);

    return (
        <View style={[{ flex: 1 }, style]}>

            {/* הצד של התפריט — מוצג רק אם לא בלוגין/סיינאפ */}
            {!isAuthScreen && (
                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX }] },
                    ]}
                >
                    {/* Header row */}
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

                    {/* Navigation Links */}
                    <View style={{ marginTop: 20 }}>
                        <Link href="/" style={styles.link} onPress={closeDrawer}>
                            🏠 בית
                        </Link>
                        <Link href="/ourTeam" style={styles.link} onPress={closeDrawer}>
                            הצוות שלנו
                        </Link>
                        <Link href="/orderTor" style={styles.link} onPress={closeDrawer}>
                            זימון תור
                        </Link>
                        <Link href="/torList" style={styles.link} onPress={closeDrawer}>
                            התורים שלך
                        </Link>
                        <Link href="/" style={styles.link} onPress={closeDrawer}>
                            קצת עלינו
                        </Link>

                        {isAdmin && (
                            <View style={styles.adminBox}>
                                <Link href="/admin/bi_page" style={styles.link} onPress={closeDrawer}>
                                    BI Page
                                </Link>
                                <Link href="/admin/torim" style={styles.link} onPress={closeDrawer}>
                                    Admin Appointments
                                </Link>
                                <Link href="/admin/settings" style={styles.link} onPress={closeDrawer}>
                                    Admin Settings
                                </Link>
                            </View>
                        )}
                    </View>

                    {/* Logout Button */}
                    <View style={styles.logoutBtn}>
                        <Button title="Log out" onPress={() => logout()} />
                    </View>
                </Animated.View>
            )}

            {/* Dim background when open */}
            {open && !isAuthScreen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={closeDrawer}
                />
            )}

            {/* Page content */}
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

    adminBox: {
        borderColor: "white",
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 24,
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

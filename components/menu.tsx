// components/CustomDrawer.tsx
import { useUserDataContext } from "@/contexts/UserDataContext";
import { Link } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Button,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';


type RenderProp = (toggleDrawer: () => void) => React.ReactNode;
type Props = { children: RenderProp };

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.7);

export default function Menu({ children }: Props) {

    const { userData } = useUserDataContext();

    const { logout, isAdmin } = useAuth();

    // start off-screen to the RIGHT
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
        setOpen(true);
        animateTo(0);
    }, [animateTo]);

    const closeDrawer = useCallback(() => {
        animateTo(DRAWER_WIDTH); // slide out to the RIGHT
        setTimeout(() => setOpen(false), 250);
    }, [animateTo]);

    const toggleDrawer = useCallback(() => {
        open ? closeDrawer() : openDrawer();
    }, [open, openDrawer, closeDrawer]);

    const content = useMemo(() => children(toggleDrawer), [children, toggleDrawer]);

    return (
        <View style={{ flex: 1 }}>
            {/* Drawer panel (anchored to the RIGHT) */}
            <Animated.View
                style={[
                    styles.drawer,
                    { transform: [{ translateX }] },
                ]}
            >
                {/* Header row: title aligned right + X button on the far right */}
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
                    <Text style={styles.section} >ברוך הבא, {userData?.name}</Text>
                </View>

                {/* Links (right-aligned) */}
                <View style={{ marginTop: 20 }}>
                    <Link href="/" style={styles.link} onPress={closeDrawer}>
                        🏠 Home
                    </Link>
                    <Link href="/ourTeam" style={styles.link} onPress={closeDrawer}>
                        Our team
                    </Link>
                    <Link href="/orderTor" style={styles.link} onPress={closeDrawer}>
                        Order tor
                    </Link>
                    <Link href="/torList" style={styles.link} onPress={closeDrawer}>
                        your torim
                    </Link>
                    <Link href="/" style={styles.link} onPress={closeDrawer}>
                        About
                    </Link>
                    {isAdmin && <>
                        <Link href="/admin/bi_page" style={styles.link} onPress={closeDrawer}>
                            BI Page
                        </Link>
                        <Link href="/admin/torim" style={styles.link} onPress={closeDrawer}>
                            Admin Appointmetns
                        </Link>

                    </>}
                </View>
                <View style={styles.logoutBtn} >
                    <Button
                        title="Log out"
                        onPress={() => logout()}
                    />
                </View>
            </Animated.View>

            {/* Dim overlay */}
            {open && (
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeDrawer} />
            )}

            {/* App UI (header + Slot) */}
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0, // anchor to the RIGHT
        width: DRAWER_WIDTH,
        backgroundColor: '#111',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 10,

        // Right‑aligned content
        alignItems: 'stretch',
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    section: {
        flex: 1,
        color: '#888',
        fontSize: 14,
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'right', // title text aligned RIGHT
    },

    closeBtn: {
        marginLeft: 12,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },

    closeText: {
        color: '#fff',
        fontSize: 20,
        lineHeight: 20,
    },


    link: {
        color: '#fff',
        fontSize: 18,
        marginVertical: 12,
        textAlign: 'right', // links aligned RIGHT
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 5,
    },
    logoutBtn: {
        flex: 1,
        justifyContent: "space-evenly"

    }
});

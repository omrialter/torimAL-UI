// app/admin/settings/index.tsx
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";

// Sections
import ColorPresetSettingsSection from "./ColorPresetSettingsSection";
import EmployeesSettingsSection from "./EmployeesSettingsSection";
import MediaSettingsSection from "./MediaSettingsSection";
import OpeningHoursSettingsSection from "./OpeningHoursSettingsSection";
import PushSettingsSection from "./PushSettingsSection";
import ServicesSettingsSection from "./ServicesSettingsSection";
import SupportSettingsSection from "./SupportSettingsSection";
import TextsSettingsSection from "./TextsSettingsSection";

// ----------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------

type SectionKey =
    | "media"
    | "texts"
    | "services"
    | "openingHours"
    | "colors"
    | "support"
    | "push"
    | "employees";

const NAV_SECTIONS: {
    key: SectionKey;
    title: string;
    subtitle: string;
    icon: string;
}[] = [
        {
            key: "media",
            title: "מדיה ותמונות",
            subtitle: "באנרים, וידאו וגלריה",
            icon: "🖼️",
        },
        {
            key: "texts",
            title: "טקסטים ומידע",
            subtitle: "הודעות, כתובת ואודות",
            icon: "✏️",
        },
        {
            key: "services",
            title: "שירותים",
            subtitle: "ניהול טיפולים ומחירים",
            icon: "💇‍♀️",
        },
        {
            key: "openingHours",
            title: "שעות עבודה",
            subtitle: "זמני פתיחה וחסימות",
            icon: "🕒",
        },
        {
            key: "colors",
            title: "עיצוב",
            subtitle: "צבעי המותג באפליקציה",
            icon: "🎨",
        },
        {
            key: "employees",
            title: "צוות",
            subtitle: "ניהול עובדים ומשתמשים",
            icon: "👥",
        },
        {
            key: "push",
            title: "הודעות Push",
            subtitle: "שליחת עדכונים ללקוחות",
            icon: "📣",
        },
        {
            key: "support",
            title: "תמיכה",
            subtitle: "יצירת קשר ודיווח תקלה",
            icon: "🆘",
        },
    ];

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function SettingsScreen() {
    const { businessData, colors } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    // המרת נתונים בטוחה
    const business = businessData as any;
    const businessId = business?._id;

    // ערכת צבעים
    const theme = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const [activeSection, setActiveSection] = useState<SectionKey>("media");

    const scrollRef = useRef<ScrollView | null>(null);
    const [sectionsTopY, setSectionsTopY] = useState(0);

    const handleSelectSection = (key: SectionKey) => {
        setActiveSection(key);
        // גלילה חלקה לאזור העריכה
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                y: sectionsTopY,
                animated: true,
            });
        }
    };

    // --- Guards ---

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>אין לך הרשאות צפייה במסך זה.</Text>
            </View>
        );
    }

    if (!businessId) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>טוען הגדרות...</Text>
            </View>
        );
    }

    // --- Render ---

    return (
        <ScrollView
            ref={scrollRef}
            style={[styles.root, { backgroundColor: theme.secondary }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={[styles.title, { color: theme.primary }]}>
                הגדרות העסק
            </Text>

            {/* --- Navigation Grid --- */}
            <View style={styles.navGrid}>
                {NAV_SECTIONS.map((section) => {
                    const isActive = activeSection === section.key;

                    return (
                        <TouchableOpacity
                            key={section.key}
                            style={[
                                styles.navItem,
                                isActive && {
                                    borderColor: theme.primary,
                                    backgroundColor: "#eef2ff", // כחול בהיר מאוד
                                },
                            ]}
                            onPress={() => handleSelectSection(section.key)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.navHeader}>
                                <View
                                    style={[
                                        styles.navIconCircle,
                                        isActive && { backgroundColor: theme.primary },
                                    ]}
                                >
                                    <Text style={[styles.navIcon, isActive && { color: "#fff" }]}>
                                        {section.icon}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.navTextWrapper}>
                                <Text
                                    style={[
                                        styles.navTitle,
                                        isActive && { color: theme.third },
                                    ]}
                                >
                                    {section.title}
                                </Text>
                                <Text style={styles.navSubtitle} numberOfLines={2}>
                                    {section.subtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* --- Active Section Content --- */}
            <View
                style={styles.sectionContainer}
                onLayout={(e) => setSectionsTopY(e.nativeEvent.layout.y)}
            >
                {activeSection === "media" && <MediaSettingsSection />}
                {activeSection === "texts" && <TextsSettingsSection />}
                {activeSection === "services" && <ServicesSettingsSection />}
                {activeSection === "openingHours" && <OpeningHoursSettingsSection />}
                {activeSection === "colors" && <ColorPresetSettingsSection />}
                {activeSection === "support" && <SupportSettingsSection />}
                {activeSection === "push" && <PushSettingsSection />}
                {activeSection === "employees" && <EmployeesSettingsSection />}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 100, // מרווח תחתון נדיב
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        color: "#6b7280",
    },
    errorText: {
        color: "#ef4444",
        fontSize: 16,
        textAlign: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 20,
    },

    // Grid
    navGrid: {
        flexDirection: "row-reverse", // RTL
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 24,
    },
    navItem: {
        width: "48%", // שתי עמודות
        minHeight: 120,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        padding: 12,
        borderWidth: 1,
        borderColor: "transparent", // שומר מקום לגבול הנבחר

        // Shadow
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,

        justifyContent: "space-between",
    },
    navHeader: {
        alignItems: "flex-start", // Icon on left (because of RTL context? actually in RN default is LTR, lets check)
        // אם כל האפליקציה ב-RTL (I18nManager), אז flex-start זה ימין.
        // כאן אנחנו רוצים את האייקון בצד אחד ואת הטקסט בצד השני או למטה.
        // העיצוב המקורי שם את האייקון למעלה משמאל (alignSelf: flex-start).
        // בוא נשמור על זה נקי:
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end', // אייקון בשמאל (במבט עברית זה שמאל)
    },
    navIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
        justifyContent: "center",
    },
    navIcon: {
        fontSize: 18,
    },
    navTextWrapper: {
        marginTop: 12,
        alignItems: "flex-end", // יישור לימין (עברית)
    },
    navTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
        textAlign: "right",
    },
    navSubtitle: {
        fontSize: 12,
        color: "#6b7280",
        textAlign: "right",
        lineHeight: 16,
    },

    // Section Area
    sectionContainer: {
        marginTop: 8,
        // אפשר להוסיף כאן רקע לבן לכל הסקשן אם רוצים להבליט אותו
        // backgroundColor: '#fff',
        // borderRadius: 16,
        // padding: 16,
    },
});
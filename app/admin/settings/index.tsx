// app/admin/settings/Settings.tsx
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

import ColorPresetSettingsSection from "./ColorPresetSettingsSection";
import EmployeesSettingsSection from "./EmployeesSettingsSection";
import MediaSettingsSection from "./MediaSettingsSection";
import OpeningHoursSettingsSection from "./OpeningHoursSettingsSection";
import PushSettingsSection from "./PushSettingsSection";
import ServicesSettingsSection from "./ServicesSettingsSection";
import SupportSettingsSection from "./SupportSettingsSection";
import TextsSettingsSection from "./TextsSettingsSection";

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
            subtitle: "באנרים, וידאו וגלריית עבודות",
            icon: "🖼️",
        },
        {
            key: "texts",
            title: "טקסטים ומידע",
            subtitle: "הודעה קופצת, כתובת, קצת עלינו",
            icon: "✏️",
        },
        {
            key: "services",
            title: "שירותים",
            subtitle: "הגדרת שירותים ומחירים (בקרוב)",
            icon: "💇‍♀️",
        },
        {
            key: "openingHours",
            title: "שעות עבודה",
            subtitle: "שעות פתיחה וסגירה לכל יום",
            icon: "🕒",
        },
        {
            key: "colors",
            title: "צבעי אפליקציה",
            subtitle: "בחירת פריסט צבעים למיתוג",
            icon: "🎨",
        },
        {
            key: "support",
            title: "תמיכה ויצירת קשר",
            subtitle: "פניה לעזרה, דיווח תקלה, הצעות (בקרוב)",
            icon: "🆘",
        },
        {
            key: "push",
            title: "הודעות Push",
            subtitle: "שליחת הודעות ללקוחות (בקרוב)",
            icon: "📣",
        },
        {
            key: "employees",
            title: "ניהול עובדים",
            subtitle: "הוספה ועריכת משתמשים (בקרוב)",
            icon: "👥",
        },
    ];

export default function Settings() {
    const { businessData, colors } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    const business = (businessData || {}) as any;
    const colorsSafe = {
        primary: colors?.primary ?? "#1d4ed8",
        secondary: colors?.secondary ?? "#f3f4f6",
        third: colors?.third ?? "#0b1120",
    };

    const businessId = business?._id;

    const [activeSection, setActiveSection] = useState<SectionKey>("media");

    // 👇 ref ל-ScrollView + מיקום תחילת הסקשנים
    const scrollRef = useRef<ScrollView | null>(null);
    const [sectionsTopY, setSectionsTopY] = useState(0);

    const handleSelectSection = (key: SectionKey) => {
        setActiveSection(key);
        // גלילה למטה לתחילת הסקשנים
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                y: sectionsTopY,
                animated: true,
            });
        }
    };

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text>אין לך הרשאות לעמוד זה.</Text>
            </View>
        );
    }

    if (!businessId) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>טוען נתוני עסק...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            style={[styles.root, { backgroundColor: colorsSafe.secondary }]}
            contentContainerStyle={styles.content}
        >
            <Text style={[styles.title, { color: colorsSafe.primary }]}>
                הגדרות עסק
            </Text>

            {/* ניווט ראשי – גריד של קופסאות */}
            <View style={styles.navGrid}>
                {NAV_SECTIONS.map((section) => {
                    const isActive = activeSection === section.key;

                    return (
                        <TouchableOpacity
                            key={section.key}
                            style={[
                                styles.navItem,
                                isActive && {
                                    borderColor: colorsSafe.primary,
                                    backgroundColor: "#eef2ff",
                                },
                            ]}
                            onPress={() => handleSelectSection(section.key)}
                            activeOpacity={0.9}
                        >
                            <View
                                style={[
                                    styles.navIconCircle,
                                    isActive && {
                                        backgroundColor: colorsSafe.primary,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.navIcon,
                                        isActive && { color: "#ffffff" },
                                    ]}
                                >
                                    {section.icon}
                                </Text>
                            </View>

                            <View style={styles.navTextWrapper}>
                                <Text
                                    style={[
                                        styles.navTitle,
                                        isActive && { color: colorsSafe.third },
                                    ]}
                                >
                                    {section.title}
                                </Text>
                                <Text style={styles.navSubtitle}>
                                    {section.subtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* הסקשן הנבחר מתחת לגריד */}
            <View
                style={{ marginTop: 12, gap: 16 }}
                onLayout={(e) => setSectionsTopY(e.nativeEvent.layout.y)}
            >
                {activeSection === "media" && <MediaSettingsSection />}
                {activeSection === "texts" && <TextsSettingsSection />}
                {activeSection === "services" && <ServicesSettingsSection />}
                {activeSection === "openingHours" && (
                    <OpeningHoursSettingsSection />
                )}
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
        paddingBottom: 120, // ⬅️ מרווח יפה ונקי
        gap: 16,
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },

    // ==== ניווט כגריד של 8 קופסאות ====
    navGrid: {
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 10,
        columnGap: 10,
        marginBottom: 4,
    },
    navItem: {
        width: "48%",
        minHeight: 110,
        borderRadius: 18,
        backgroundColor: "#ffffff",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    navIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        alignSelf: "flex-start",
    },
    navIcon: {
        fontSize: 20,
    },
    navTextWrapper: {
        alignItems: "flex-end",
        width: "100%",
    },
    navTitle: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "right",
        marginBottom: 2,
        color: "#111827",
    },
    navSubtitle: {
        fontSize: 11,
        color: "#6b7280",
        textAlign: "right",
    },
});

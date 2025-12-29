// app/admin/bi_page.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useBusinessData } from "../../hooks/useBusinessData";
import { apiGet } from "../../services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type StatsData = {
    totalClients: number;
    completedThisMonth: number;
    noShowThisMonth: number;
    completedLastMonth: number;
    noShowLastMonth: number;
    inactiveUsers: number;
};

const { width } = Dimensions.get("window");

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function BusinessStatsScreen() {
    const { colors, businessData } = useBusinessData();
    const { userToken } = useAuth();

    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const BUSINESS_ID = Constants.expoConfig?.extra?.BUSINESS_ID;

    const fetchStats = useCallback(async () => {
        if (!BUSINESS_ID || !userToken) return;

        try {
            // אין צורך ב-${URL}, ה-apiGet מטפל בזה
            const data = await apiGet<StatsData>(`/businesses/${BUSINESS_ID}/stats`);
            if (data) {
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to load stats:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [BUSINESS_ID, userToken]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    // --- Sub-Component: Stat Card ---
    const StatCard = ({
        title,
        value,
        subValue,
        icon,
        color,
        bgColor,
    }: {
        title: string;
        value: number | string;
        subValue?: string;
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        color: string;
        bgColor: string;
    }) => (
        <View style={[styles.card, { backgroundColor: bgColor || "#fff" }]}>
            <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
                <MaterialCommunityIcons name={icon} size={28} color={color} />
            </View>

            <View>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>

            {subValue && (
                <View style={styles.subValueContainer}>
                    <Text style={styles.subValueText}>{subValue}</Text>
                </View>
            )}
        </View>
    );

    // --- Loading State ---
    if (loading && !stats) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // --- Data Conversion & Fallbacks ---
    // המרת הנתונים לטיפוס המקומי כדי למנוע שגיאות (במקרה ו-businessData הוא any/unknown)
    const businessName = (businessData as any)?.name || "העסק שלי";

    return (
        <ScrollView
            contentContainerStyle={[styles.container, { flexGrow: 1 }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.primary }]}>
                    סקירה עסקית
                </Text>
                <Text style={styles.subtitle}>
                    {businessName} - נתונים בזמן אמת
                </Text>
            </View>

            <View style={styles.grid}>
                {/* סה"כ לקוחות */}
                <StatCard
                    title="לקוחות רשומים"
                    value={stats?.totalClients || 0}
                    icon="account-group"
                    color="#3B82F6" // כחול
                    bgColor="#EFF6FF"
                />

                {/* תורים שהושלמו החודש */}
                <StatCard
                    title="תורים שהושלמו החודש"
                    value={stats?.completedThisMonth || 0}
                    subValue={`בחודש שעבר: ${stats?.completedLastMonth || 0}`}
                    icon="check-circle-outline"
                    color="#10B981" // ירוק
                    bgColor="#ECFDF5"
                />

                {/* הברזות */}
                <StatCard
                    title="הברזות ללא ביטול"
                    value={stats?.noShowThisMonth || 0}
                    subValue={`בחודש שעבר: ${stats?.noShowLastMonth || 0}`}
                    icon="account-alert-outline"
                    color="#EF4444" // אדום
                    bgColor="#FEF2F2"
                />

                {/* לקוחות רדומים */}
                <StatCard
                    title="לקוחות לא פעילים (>3 חודשים)"
                    value={stats?.inactiveUsers || 0}
                    icon="sleep"
                    color="#F59E0B" // כתום
                    bgColor="#FFFBEB"
                />
            </View>

            <View style={[styles.infoBox, { borderColor: colors.secondary }]}>
                <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                    הנתונים מתעדכנים בזמן אמת. משוך למטה לרענון.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: "#fff", // רקע בסיס נקי
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    header: {
        marginBottom: 24,
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 4,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    card: {
        width: (width - 50) / 2, // חישוב רוחב: (מסך - רווחים) / 2
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        // צל עדין
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 4,
        textAlign: "left", // מספרים עדיף משמאל גם בעברית לעיתים, אבל כאן תלוי העדפה
    },
    cardTitle: {
        fontSize: 13,
        color: "#6b7280",
        lineHeight: 18,
        textAlign: "right", // עברית
        writingDirection: "rtl",
    },
    subValueContainer: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    subValueText: {
        fontSize: 12,
        color: "#9ca3af",
        textAlign: "right",
        writingDirection: "rtl",
    },
    infoBox: {
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: "row", // LTR layout for icon + text
        alignItems: "center",
        backgroundColor: "#f9fafb",
    },
    infoText: {
        marginLeft: 10,
        color: "#4b5563",
        fontSize: 14,
        flex: 1,
        textAlign: "right",
        writingDirection: "rtl",
    },
});
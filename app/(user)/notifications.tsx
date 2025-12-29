// app/(user)/notifications.tsx

import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost } from "@/services/api";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type NotificationType = "admin_broadcast" | "system" | "reminder";

interface NotificationItem {
    _id: string;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, any>;
    createdAt: string;
    isRead?: boolean; // אם השרת תומך בזה בעתיד
}

interface LatestResponse {
    notifications: NotificationItem[];
    hasUnread: boolean;
    latestCreatedAt: string | null;
    lastSeenNotificationsAt: string | null;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function formatRelativeTime(dateIso: string) {
    const d = new Date(dateIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "ממש עכשיו";
    if (diffMin < 60) return `לפני ${diffMin} דק'`;

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `לפני ${diffH} ש'`;

    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "אתמול";
    if (diffD < 7) return `לפני ${diffD} ימים`;

    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function NotificationsScreen() {
    const { userToken } = useAuth(); // לשימוש ב-Effect אם צריך תלות

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * טעינת ההתראות האחרונות
     */
    const fetchLatest = useCallback(async () => {
        setError(null);
        try {
            const res = await apiGet<LatestResponse>("/notifications/latest");

            if (res) {
                setItems(Array.isArray(res.notifications) ? res.notifications : []);
                setHasUnread(!!res.hasUnread);
            } else {
                setItems([]);
            }
        } catch (e: any) {
            console.error("Notifications fetch error:", e);
            throw e; // מעבירים הלאה לטיפול ב-catch החיצוני
        }
    }, []);

    /**
     * סימון שההתראות נקראו
     */
    const markSeen = useCallback(async () => {
        try {
            await apiPost("/notifications/mark-seen", {});
            setHasUnread(false);
        } catch {
            // שגיאה שקטה (לא קריטי למשתמש)
        }
    }, []);

    /**
     * טעינה וסימון בעת כניסה למסך
     */
    useFocusEffect(
        useCallback(() => {
            let active = true;

            const load = async () => {
                try {
                    if (active) setLoading(true);
                    await fetchLatest();
                    if (active) await markSeen();
                } catch (e: any) {
                    if (active) setError(e.message || "שגיאה בטעינת התראות");
                } finally {
                    if (active) setLoading(false);
                }
            };

            load();

            return () => {
                active = false;
            };
        }, [fetchLatest, markSeen])
    );

    /**
     * רענון ידני
     */
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchLatest();
            await markSeen();
        } catch (e: any) {
            setError(e.message || "שגיאה ברענון");
        } finally {
            setRefreshing(false);
        }
    }, [fetchLatest, markSeen]);

    // מצב ריק
    const emptyState = useMemo(() => {
        if (loading || items.length > 0) return null;

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>אין התראות חדשות</Text>
                <Text style={styles.emptyText}>
                    כאן יופיעו הודעות ועדכונים מהעסק.
                </Text>
            </View>
        );
    }, [loading, items.length]);

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>התראות</Text>
                    {hasUnread && <View style={styles.unreadDot} />}
                </View>
            </View>

            {/* Content */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>טוען...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorTitle}>אופס!</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                        <Text style={styles.retryText}>נסה שוב</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {items.map((item) => (
                        <View key={item._id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
                                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            </View>
                            <Text style={styles.cardBody}>{item.body}</Text>
                        </View>
                    ))}

                    {emptyState}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#f3f4f6", // רקע אפור בהיר אחיד
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: "#f3f4f6",
    },
    titleRow: {
        flexDirection: "row", // ברירת מחדל LTR, אבל הטקסט יהיה מיושר לימין
        justifyContent: "flex-end", // מיישר לימין
        alignItems: "center",
        gap: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ef4444", // אדום
        marginTop: 4,
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: "#666",
    },

    errorTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    errorText: {
        textAlign: "center",
        color: "#666",
        marginBottom: 16,
    },
    retryBtn: {
        backgroundColor: "#111",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: "#fff",
        fontWeight: "600",
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Card Styles
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111",
        flex: 1,
        textAlign: "right", // עברית
        marginLeft: 10,
    },
    cardTime: {
        fontSize: 12,
        color: "#9ca3af",
    },
    cardBody: {
        fontSize: 14,
        color: "#4b5563",
        textAlign: "right", // עברית
        lineHeight: 20,
    },

    // Empty State
    emptyContainer: {
        alignItems: "center",
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
    },
    emptyText: {
        color: "#9ca3af",
        textAlign: "center",
        maxWidth: 250,
    },
});
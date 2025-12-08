import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type JumpingMsgProps = {
    style?: StyleProp<ViewStyle>;
};

type TimeRange = {
    open: string | null;
    close: string | null;
};

type OpeningHours = {
    sunday?: TimeRange;
    monday?: TimeRange;
    tuesday?: TimeRange;
    wednesday?: TimeRange;
    thursday?: TimeRange;
    friday?: TimeRange;
    saturday?: TimeRange;
};

const DAY_LABELS: { key: keyof OpeningHours; label: string }[] = [
    { key: "sunday", label: "ראשון" },
    { key: "monday", label: "שני" },
    { key: "tuesday", label: "שלישי" },
    { key: "wednesday", label: "רביעי" },
    { key: "thursday", label: "חמישי" },
    { key: "friday", label: "שישי" },
    { key: "saturday", label: "שבת" },
];

function buildOpeningHoursLines(openingHours?: OpeningHours): string[] {
    if (!openingHours) return [];

    const lines: string[] = [];

    for (const { key, label } of DAY_LABELS) {
        const day = openingHours[key];

        const isClosed =
            !day ||
            (day.open == null && day.close == null) ||
            (day.open === "" && day.close === "");

        if (isClosed) {
            lines.push(`${label}: סגור`);
        } else {
            const open = day.open ?? "";
            const close = day.close ?? "";
            if (open && close) {
                lines.push(`${label}: ${open}–${close}`);
            } else if (open) {
                lines.push(`${label}: מ־${open}`);
            } else if (close) {
                lines.push(`${label}: עד ${close}`);
            } else {
                lines.push(`${label}: סגור`);
            }
        }
    }

    return lines;
}

export default function JumpingMsg({ style }: JumpingMsgProps) {
    const { businessData } = useBusinessDataContext();

    const openingLines = buildOpeningHoursLines(
        (businessData as any)?.openingHours
    );

    return (
        <View style={[styles.view, style]}>
            {/* כותרת שעות פתיחה */}
            <Text style={[styles.message, styles.title]}>שעות פתיחה</Text>

            {/* שורות ימים */}
            {openingLines.length > 0 ? (
                openingLines.map((line) => (
                    <Text key={line} style={styles.message}>
                        {line}
                    </Text>
                ))
            ) : (
                <Text style={styles.message}>לא הוגדרו שעות פתיחה</Text>
            )}

            {/* מפריד קטן לפני ההודעה */}
            {!!businessData?.message && (
                <>
                    <View style={styles.separator} />
                    <Text style={styles.message}>{businessData.message}</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    view: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: "flex-end", // RTL
        gap: 2,
        backgroundColor: "#211f1f",
        justifyContent: "center",
        borderRadius: 16,
    },
    message: {
        fontSize: 14,
        textAlign: "right",
        color: "#f9fafb",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    separator: {
        height: 1,
        backgroundColor: "#4b5563",
        alignSelf: "stretch",
        marginVertical: 4,
    },
});

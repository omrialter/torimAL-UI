import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type JumpingMsgProps = {
    style?: StyleProp<ViewStyle>;
};

export default function JumpingMsg({ style }: JumpingMsgProps) {
    const { businessData } = useBusinessDataContext();

    return (
        <View style={[styles.view, style]}>
            <Text style={styles.message}>
                שעות פתיחה: {businessData.openingHoursTxt}
            </Text>

            <Text style={styles.message}>
                {businessData.message}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    view: {
        paddingVertical: 6,
        alignItems: "center",
        gap: 6,
        backgroundColor: "#808080", // או אפור אם תרצה
        justifyContent: "center",
        borderRadius: 16,
    },

    message: {
        fontSize: 20,
        textAlign: "center",
        color: "#fafafa",
    },
});

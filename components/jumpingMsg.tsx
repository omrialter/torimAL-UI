import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { StyleSheet, Text, View } from "react-native";

export default function JumpingMsg() {
    const { businessData } = useBusinessDataContext();

    return (
        <View style={styles.view}>
            <Text style={styles.message}>שעות פתיחה: {businessData.openingHoursTxt}</Text>

            <Text style={styles.message}>{businessData.message}</Text>

        </View>
    )

}

const styles = StyleSheet.create({
    view: {
        paddingVertical: 6,            // ❗ don’t use flex:1 inside accordion content
        alignItems: "center",
        gap: 6,
        backgroundColor: "#808080",
        justifyContent: "center",
        borderRadius: 16
    },


    message: {
        fontSize: 20,
        textAlign: "center",
        color: "#fafafa"
    }
})


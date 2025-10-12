import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from '../../contexts/AuthContext';


export default function Index() {
    const { businessData } = useBusinessDataContext();
    const { isAdmin } = useAuth();
    console.log("is this an admin?(index)" + isAdmin);



    return (
        <View style={styles.view}>
            {
                isAdmin ?
                    <Text style={styles.title}>Welcome Boss!</Text>
                    :
                    <Text style={styles.title}>Welcome to torimAL!</Text>
            }

            <Text style={styles.message}>{businessData.message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    view: {
        flex: 1,
        justifyContent: "space-evenly",
        alignItems: "center",
    },

    title: {
        fontWeight: "bold",
        fontSize: 20
    },

    navButton: {
        backgroundColor: "orange",
        width: 200,
        height: 40,
        borderRadius: 8,
        marginTop: 4,
        justifyContent: "center",
        alignItems: "center",
    },

    navButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    message: {
        fontSize: 20,
        textAlign: "center"

    }
})

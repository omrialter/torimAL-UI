import SimpleAccordion from "@/components/SimpleAccordion";
import VideoBanner from "@/components/VideoBanner";
import { useBusinessDataContext } from "@/contexts/BusinessDataContext";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import JumpingMsg from "../../components/jumpingMsg";
import { useAuth } from "../../contexts/AuthContext";

export default function Index() {
    const [expanded, setExpanded] = useState(true);
    const handlePress = () => setExpanded(!expanded);
    const { businessData } = useBusinessDataContext();
    const { isAdmin } = useAuth();

    useEffect(() => {
        setExpanded(true);
    }, []);

    const BANNER_HEIGHT = 320;

    return (
        <View >
            <View style={styles.container}>

                <VideoBanner
                    source={require("@/assets/videos/bannerVideo.mp4")}
                    aspectRatio={16 / 9}
                    enableCaching={false}
                    zIndex={0} // 👈 background
                />

                <SimpleAccordion title="הודעה מהעסק">
                    <JumpingMsg />
                </SimpleAccordion>
            </View>


            {/* 3) Welcome line */}
            <Text style={styles.title}>
                {isAdmin ? "Welcome Boss!" : "Welcome to torimAL!"}
            </Text>

        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        backgroundColor: "red",
        width: "100%",
        paddingBottom: 24,
        alignItems: "stretch", // children take full width
        gap: 16,               // nice spacing between sections
    },

    section: {
        width: "100%",
    },

    bannerWrap: {
        width: "100%",
        position: "relative",  // required for the absolute VideoBanner
        overflow: "hidden",
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        backgroundColor: "#000",
    },

    title: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 20,
        marginTop: 4,
    },

    // (optional) examples if you need them later:
    businessMSG: {
        marginTop: 0,
        width: "100%",
        textAlign: "center",
    },
    accordion: {
        backgroundColor: "#808080",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
});

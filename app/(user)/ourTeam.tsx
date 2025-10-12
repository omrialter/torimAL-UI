import React from 'react';
import { StyleSheet, Text, View } from 'react-native';


export default function OurTeam() {

    return (
        <View style={styles.view}>
            <Text> הצוות שלנו</Text>

        </View>

    )


}

const styles = StyleSheet.create({
    view: {
        flex: 1,
        justifyContent: "space-evenly", // spacing along main axis (vertical by default)
        alignItems: "center",            // horizontal alignment
    },
})
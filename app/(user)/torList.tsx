import React from 'react';
import { StyleSheet, Text, View } from 'react-native';


export default function torList() {

    return (
        <View style={styles.view}>
            <Text> התורים שלך יאלה לך להסתפר!</Text>

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
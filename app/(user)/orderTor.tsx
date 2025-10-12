import React from 'react';
import { StyleSheet, Text, View } from 'react-native';


export default function OrderTor() {

    return (
        <View style={styles.view}>
            <Text>הזמן תור אח יקר</Text>

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
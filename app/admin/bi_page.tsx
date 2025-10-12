import { useRouter } from 'expo-router';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';


export default function Bi_Page() {

    const router = useRouter();

    const goHome = () => {
        router.replace('/(user)');
    }


    return (
        <View style={styles.view}>
            <Text>Hello admin!</Text>
            <Button title="Back home" onPress={goHome} />
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
import React from "react";
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from "react-native";

type CustomButtonProps = {
    title: string;
    onPress: () => void;
    backgroundColor?: string;
    textColor?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
};

export default function CustomButton({
    title,
    onPress,
    backgroundColor = "#007AFF", // iOS blue by default
    textColor = "#fff",
    style,
    textStyle,
    disabled = false,
}: CustomButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: disabled ? "#ccc" : backgroundColor },
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled}
        >
            <Text style={[styles.text, { color: textColor }, textStyle]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: "600",
    },
});

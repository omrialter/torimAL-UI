// components/VideoBanner.tsx
import { useFocusEffect } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type VideoBannerProps = {
    source: string | number;
    posterUri?: string;
    aspectRatio?: number;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
    enableCaching?: boolean;
    overlayOpacity?: number;
    zIndex?: number; // 👈 new
};

export default function VideoBanner({
    source,
    posterUri,
    aspectRatio = 16 / 9,
    title,
    subtitle,
    ctaLabel,
    onCtaPress,
    enableCaching = true,
    overlayOpacity = 0.45,
    zIndex = 0, // 👈 default background layer
}: VideoBannerProps) {
    const videoRef = useRef<Video>(null);
    const [cachedUri, setCachedUri] = useState<string | null>(null);
    const [isReady, setReady] = useState(false);

    // Auto-play and pause depending on focus
    useFocusEffect(
        useCallback(() => {
            (async () => {
                if (videoRef.current) await videoRef.current.playAsync();
            })();
            return () => {
                if (videoRef.current) videoRef.current.pauseAsync();
            };
        }, [])
    );

    // Cache remote video
    useEffect(() => {
        let cancelled = false;
        async function cacheVideoIfNeeded() {
            if (typeof source !== "string" || !enableCaching) return;
            try {
                const filename = encodeURIComponent(source);
                const cacheDir =
                    ((FileSystem as any).cacheDirectory ??
                        (FileSystem as any).documentDirectory) as string;
                const cachePath = `${cacheDir}${filename}.mp4`;

                const info = await FileSystem.getInfoAsync(cachePath);
                if (info.exists) {
                    if (!cancelled) setCachedUri(cachePath);
                    return;
                }

                const { uri } = await FileSystem.downloadAsync(source, cachePath);
                if (!cancelled) setCachedUri(uri);
            } catch (err) {
                console.warn("Video caching failed:", err);
                if (!cancelled) setCachedUri(null);
            }
        }
        cacheVideoIfNeeded();
        return () => {
            cancelled = true;
        };
    }, [source, enableCaching]);

    const videoSource = useMemo(() => {
        if (typeof source === "number") return source;
        if (cachedUri) return { uri: cachedUri };
        return { uri: source as string };
    }, [source, cachedUri]);

    return (
        <View style={[styles.wrapper, { aspectRatio, zIndex }]}>
            <Video
                ref={videoRef}
                style={StyleSheet.absoluteFill}
                source={videoSource as any}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay
                isMuted
                posterSource={posterUri ? { uri: posterUri } : undefined}
                posterStyle={StyleSheet.absoluteFill}
                usePoster={!isReady}
                onReadyForDisplay={() => setReady(true)}
                volume={1.0}
            />

            <LinearGradient
                colors={["rgba(0,0,0,0)", `rgba(0,0,0,${overlayOpacity})`]}
                locations={[0.2, 1]}
                style={StyleSheet.absoluteFill}
            />

            {(title || subtitle || ctaLabel) && (
                <View style={styles.content}>
                    {title ? <Text style={styles.title}>{title}</Text> : null}
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    {ctaLabel ? (
                        <Text
                            style={[styles.ctaText, { textDecorationLine: "underline" }]}
                            onPress={onCtaPress}
                        >
                            {ctaLabel}
                        </Text>
                    ) : null}
                </View>
            )}

            {!isReady && (
                <View style={styles.loader}>
                    <ActivityIndicator />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute", // 👈 makes it sit behind other components
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#000",
        overflow: "hidden",
    },
    content: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 18,
        gap: 8,
    },
    title: { color: "#fff", fontSize: 24, fontWeight: "700" },
    subtitle: { color: "#f2f2f2", fontSize: 14 },
    ctaText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    loader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
});

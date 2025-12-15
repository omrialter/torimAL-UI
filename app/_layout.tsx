// app/_layout.tsx
import Header from "@/components/header";
import Menu from "@/components/menu";
import { AppProviders } from "@/contexts/AppProviders";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}


// --- Notifications handler ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    const subReceived = Notifications.addNotificationReceivedListener((notification) => {
      console.log("🔔 Notification received:", notification);
    });

    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("👉 User tapped notification:", response);
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, []);

  return (
    <AppProviders>
      <SafeAreaProvider>
        <StatusBar
          style="light"
          backgroundColor="#222121ff"
          translucent={false}
          hidden={false}
        />

        {/* <SafeAreaView style={styles.root}> */}
        <Menu style={styles.menuStyle}>
          {(toggleDrawer: any) => (
            <View style={styles.content}>
              <Header onMenuPress={toggleDrawer} />
              <Slot />
            </View>
          )}
        </Menu>
        {/* </SafeAreaView> */}
      </SafeAreaProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  menuStyle: { zIndex: 50 },
});

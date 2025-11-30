// app/_layout.tsx
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Header from "@/components/header";
import Menu from "@/components/menu";
// <-- ensure this path is correct
import { AppProviders } from "@/contexts/AppProviders";
import { StyleSheet } from "react-native";



console.log("_layout.tsx is running");

export default function RootLayout() {
  return (
    <AppProviders>
      <SafeAreaProvider>
        {/* Global StatusBar */}
        <StatusBar
          style="light"
          backgroundColor="#222121ff"
          translucent={false}
          hidden={false}
        />

        {/* Drawer wrapper around entire app */}
        <Menu style={styles.menuStyle}>
          {(toggleDrawer) => (
            <>
              <Header onMenuPress={toggleDrawer} />
              <Slot />
            </>
          )}
        </Menu>

      </SafeAreaProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  menuStyle: {
    zIndex: 50,
  },
});

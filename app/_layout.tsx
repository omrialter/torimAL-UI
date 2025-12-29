// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Header from "@/components/header";
import Menu from "@/components/menu";
import { AppProviders } from "@/contexts/AppProviders";

// ----------------------------------------------------------------------
// RTL Configuration
// ----------------------------------------------------------------------

// כפיית כיווניות LTR (שמאל לימין) למניעת שבירת עיצוב במכשירים בעברית/ערבית
// השינוי דורש Restart לאפליקציה כדי לחול בפעם הראשונה
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

// ----------------------------------------------------------------------
// Notification Handler Configuration
// ----------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ----------------------------------------------------------------------
// Root Layout Component
// ----------------------------------------------------------------------

export default function RootLayout() {
  /**
   * ניהול מאזינים להתראות (Push Notifications)
   */
  useEffect(() => {
    // התראה התקבלה בזמן שהאפליקציה פתוחה
    const subReceived = Notifications.addNotificationReceivedListener((notification) => {
      // כאן ניתן להוסיף לוגיקה לעדכון UI בזמן אמת אם צריך
    });

    // המשתמש לחץ על ההתראה
    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      // כאן ניתן להוסיף לוגיקת ניווט (Deep Linking) למסך הרלוונטי
      // const data = response.notification.request.content.data;
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, []);

  return (
    <AppProviders>
      <SafeAreaProvider>
        {/* הגדרת הסטטוס בר העליון */}
        <StatusBar
          style="light"
          backgroundColor="#222121ff" // צבע רקע כהה (Hex עם Alpha מלא)
          translucent={false}
          hidden={false}
        />

        {/* Menu עוטף את כל האפליקציה כדי לאפשר גישה לתפריט הצד מכל מקום.
          הוא משתמש בתבנית Render Props כדי לספק את פונקציית הפתיחה (toggleDrawer).
        */}
        <Menu style={styles.menuStyle}>
          {(toggleDrawer: () => void) => (
            <View style={styles.content}>
              <Header onMenuPress={toggleDrawer} />
              {/* Slot מכיל את המסך הנוכחי (לפי הניווט) */}
              <Slot />
            </View>
          )}
        </Menu>

      </SafeAreaProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  menuStyle: {
    zIndex: 50, // וידוא שהתפריט יהיה מעל אלמנטים אחרים בעת פתיחה
  },
});
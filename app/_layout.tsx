// app/_layout.tsx
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Header from '@/components/header';
import Menu from '@/components/menu';
import { AppProviders } from "@/contexts/AppProviders";
console.log('_layout.tsx is running');

export default function RootLayout() {
  return (
    <AppProviders>
      <SafeAreaProvider>
        {/* Control the system status bar ONCE at the app root */}
        <StatusBar style="light" backgroundColor="#222121ff" translucent={false} hidden={false} />

        {/* App-wide header */}
        <Menu>
          {(toggleDrawer) => (
            <>
              <Header onMenuPress={toggleDrawer} />
              <Slot />
            </>
          )}
        </Menu>
        {/* Screen content */}
      </SafeAreaProvider>
    </AppProviders>



  );
}

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { initializeLanguage } from '../src/i18n';
import '../src/i18n/config'; // Import config to initialize i18n
import { ThemeProvider as AppThemeProvider } from '../src/theme/themeContext';
import { ThemeManagerProvider, useThemeManager } from '../src/theme/themeManager';
import { Background } from '@react-navigation/elements';

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManager();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);

  // Apply SystemUI background & StatusBar style when theme changes
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.statusBar);
    // Keep expo-status-bar for icon style
  }, [theme]);

  // Initialize language from AsyncStorage when app starts
  useEffect(() => {
    initializeLanguage().then(() => {
      setReady(true);
    });
  }, []);

  // Show loading spinner while initializing language or checking auth
  if (!ready || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primary }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <StatusBar
          style={theme.dark ? 'light' : 'dark'}
          translucent={false}
          backgroundColor={theme.colors.statusBar}
        />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={theme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.statusBar }}>
        <StatusBar
          style={theme.dark ? "light" : "dark"}
          translucent={false}
        />
        {children}
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <BottomSheetModalProvider>
      <AuthProvider>
        <ThemeManagerProvider>
          <AppThemeProvider>
            <NavigationThemeWrapper>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </NavigationThemeWrapper>
          </AppThemeProvider>
        </ThemeManagerProvider>
      </AuthProvider>
    </BottomSheetModalProvider>
  );
}
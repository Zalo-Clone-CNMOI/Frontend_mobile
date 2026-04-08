import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Background } from '@react-navigation/elements';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { initializeLanguage } from '../src/i18n';
import '../src/i18n/config'; // Import config to initialize i18n
import { useNotifications } from '../src/notifications/useNotifications';
import { ThemeProvider as AppThemeProvider } from '../src/theme/themeContext';
import { ThemeManagerProvider, useThemeManager } from '../src/theme/themeManager';

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManager();
  const { isLoading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useNotifications();

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

  if (!ready || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={theme}>
      <StatusBar
        translucent={false}
        backgroundColor={theme.colors.statusBar}
        style={theme.dark ? 'light' : 'dark'}
      />
      <Background style={{ backgroundColor: theme.colors.statusBar }}>
        {children}
      </Background>
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

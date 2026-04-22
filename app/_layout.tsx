import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Background } from '@react-navigation/elements';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppRealtimeBridge } from '../src/components/app/AppRealtimeBridge';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { initializeLanguage } from '../src/i18n';
import '../src/i18n/config';
import { useNotifications } from '../src/notifications/useNotifications';
import { ThemeProvider as AppThemeProvider } from '../src/theme/themeContext';
import { ThemeManagerProvider, useThemeManager } from '../src/theme/themeManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManager();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [isLogoutInProgress, setIsLogoutInProgress] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useNotifications();

  // Check for logout in progress
  useEffect(() => {
    const checkLogoutStatus = async () => {
      const logoutFlag = await AsyncStorage.getItem('@auth_logout_in_progress');
      setIsLogoutInProgress(logoutFlag === 'true');
    };
    
    // Check immediately and periodically during logout
    checkLogoutStatus();
    const interval = setInterval(checkLogoutStatus, 100);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.statusBar);
  }, [theme]);

  useEffect(() => {
    initializeLanguage().then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || authLoading || isLogoutInProgress) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated) {
      if (inAuthGroup || segments.length === 0) {
        setTimeout(() => router.replace('/(tabs)/home'), 0);
      }
    } else {
      if (!inAuthGroup) {
        setTimeout(() => router.replace('/(auth)'), 0);
      }
    }
  }, [ready, authLoading, isAuthenticated, segments, isLogoutInProgress]);

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
      <Background style={{ flex: 1, backgroundColor: theme.colors.statusBar }}>
        <AppRealtimeBridge />
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

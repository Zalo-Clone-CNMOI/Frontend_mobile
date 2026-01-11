import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { initializeLanguage } from '../src/i18n';
import '../src/i18n/config'; // Import config to initialize i18n
import { ThemeProvider as AppThemeProvider } from '../src/theme/themeContext';
import { ThemeManagerProvider, useThemeManager } from '../src/theme/themeManager';

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManager();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  
  // Initialize language from AsyncStorage when app starts
  useEffect(() => {
    initializeLanguage().then(() => {
      setReady(true);
    });
  }, []);
  
  // Show loading spinner while initializing language or checking auth
  if (!ready || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  return (
    <NavigationThemeProvider value={theme}>
      {children}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
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
  );
}
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { ThemeProvider as AppThemeProvider } from '../src/theme/themeContext';
import { ThemeManagerProvider, useThemeManager } from '../src/theme/themeManager';

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManager();
  
  return (
    <NavigationThemeProvider value={theme}>
      {children}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeManagerProvider>
      <AppThemeProvider>
        <NavigationThemeWrapper>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </NavigationThemeWrapper>
      </AppThemeProvider>
    </ThemeManagerProvider>
  );
}

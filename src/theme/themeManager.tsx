import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode, ThemeService } from '../services/themeService';
import { ZaloDarkTheme, ZaloLightTheme } from './customColor';

export type AppTheme = typeof ZaloLightTheme;

interface ThemeManagerContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  isSystemDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeManagerContext = createContext<ThemeManagerContextType | null>(null);

interface ThemeManagerProviderProps {
  children: ReactNode;
}

export const ThemeManagerProvider = ({ children }: ThemeManagerProviderProps) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const isSystemDark = systemScheme === 'dark';

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await ThemeService.getThemeMode();
        setThemeModeState(savedMode);
      } catch (error) {
      }
    };

    loadTheme();
  }, []);

  const getEffectiveTheme = (): AppTheme => {
    if (themeMode === 'system') {
      return isSystemDark ? ZaloDarkTheme : ZaloLightTheme;
    }
    return themeMode === 'dark' ? ZaloDarkTheme : ZaloLightTheme;
  };

  const theme = getEffectiveTheme();

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await ThemeService.saveThemeMode(mode);
  };

  const toggleTheme = () => {
    const currentEffectiveTheme = getEffectiveTheme();
    const newMode: ThemeMode = currentEffectiveTheme.dark ? 'light' : 'dark';
    void setThemeMode(newMode);
  };

  return (
    <ThemeManagerContext.Provider
      value={{
        theme,
        themeMode,
        isSystemDark,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeManagerContext.Provider>
  );
};

export const useThemeManager = (): ThemeManagerContextType => {
  const context = useContext(ThemeManagerContext);

  if (!context) {
    throw new Error('useThemeManager must be used within ThemeManagerProvider');
  }

  return context;
};

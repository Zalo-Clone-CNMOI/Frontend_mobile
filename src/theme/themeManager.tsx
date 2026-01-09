import React, { createContext, ReactNode, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ZaloDarkTheme, ZaloLightTheme } from './customColor';

type ThemeMode = 'light' | 'dark' | 'system';

type AppTheme = typeof ZaloLightTheme;

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
  
  const getEffectiveTheme = (): AppTheme => {
    if (themeMode === 'system') {
      return isSystemDark ? ZaloDarkTheme : ZaloLightTheme;
    }
    return themeMode === 'dark' ? ZaloDarkTheme : ZaloLightTheme;
  };

  const theme = getEffectiveTheme();

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    const currentEffectiveTheme = getEffectiveTheme();
    const newMode = currentEffectiveTheme.dark ? 'light' : 'dark';
    setThemeMode(newMode);
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

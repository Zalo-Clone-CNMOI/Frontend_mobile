import React, { createContext, ReactNode, useContext } from 'react';
import { useThemeManager } from './themeManager';

type AppTheme = ReturnType<typeof useThemeManager>['theme'];

const ThemeContext = createContext<AppTheme | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme } = useThemeManager();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): AppTheme => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

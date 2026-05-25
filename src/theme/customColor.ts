import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const ZaloLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,

    primary: '#0068FF',       
    background: '#FFFFFF',
    card: '#F7F8FA',
    header: '#0068FF',
    icon: '#5C5C5C',
    iconHeader: '#FFFFFF',
    text: '#1C1C1E',
    border: '#E5E6EB',
    notification: '#FF3B30',
    textHeader: '#FFFFFF',
    bubbleColor: '#262626',
    textMessage: '#fff',
    dividerSection: '#bfc0c4',
    statusBar: '#0068FF',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    muted: '#9ca3af',
    disabled: '#9CA3AF',
  },
};

export const ZaloDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,

    primary: '#0068FF',
    background: '#0E0E10',
    card: '#1C1C1E',
    header: '#1C1C1E', 
    icon: '#E5E6EB',
    text: '#FFFFFF',
    border: '#2C2C2E',
    iconHeader: '#fff',
    notification: '#FF453A',
    textHeader: '#FFFFFF',
    bubbleColor: '#0068FF',
    textMessage: '#fff',
    dividerSection: '#1C1C1E',
    statusBar:'#1C1C1E',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    muted: '#9ca3af',
    disabled: '#8E8E93',
  },
};

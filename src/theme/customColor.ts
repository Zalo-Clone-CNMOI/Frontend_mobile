import { DefaultTheme, DarkTheme } from '@react-navigation/native';

export const ZaloLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,

    primary: '#0068FF',        // Zalo blue
    background: '#FFFFFF',
    card: '#F7F8FA',
    header: '#0068FF',
    icon: '#000',
    iconHeader: '#fff',
    text: '#1C1C1E',
    border: '#E5E6EB',
    notification: '#FF3B30',
    textHeader: '#FFFFFF',
    bubbleColor: '#262626',
  },
};

export const ZaloDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,

    primary: '#4C8DFF',
    background: '#0E0E10',
    card: '#1C1C1E',
    header: '#1C1C1E', 
    icon: '#fff',
    text: '#FFFFFF',
    border: '#2C2C2E',
    iconHeader: '#fff',
    notification: '#FF453A',
    bubbleColor: '#4C8DFF',
  },
};

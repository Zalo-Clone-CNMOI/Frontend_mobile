import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import vi from './vi.json';

const resources = {
  vi: {
    translation: vi
  },
  en: {
    translation: en
  }
};

const LANGUAGE_KEY = '@app_language';

export const initI18next = async () => {
  // Get saved language from AsyncStorage
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  
  i18n
    .use(initReactI18next)
    .init({
      lng: savedLanguage || 'en', // Use saved language or default to 'en'
      fallbackLng: 'en',
      resources,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export const getCurrentLanguage = () => i18n.language;

// Initialize i18next
initI18next();

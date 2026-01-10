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

// Initialize i18n WITHOUT AsyncStorage at top-level
i18n
  .use(initReactI18next)
  .init({
    lng: 'vi', // Default language
    fallbackLng: 'vi',
    resources,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

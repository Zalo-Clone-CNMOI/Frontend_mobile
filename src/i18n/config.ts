import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en.json';
import vi from './vi.json';

const SUPPORTED = ['vi', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED)[number];

function detectInitialLanguage(): SupportedLanguage {
  try {
    const locales = getLocales();
    const best = locales[0];
    const code = best?.languageTag?.split('-')[0]?.toLowerCase();
    if (code && (SUPPORTED as readonly string[]).includes(code)) {
      return code as SupportedLanguage;
    }
  } catch {
  }
  return 'vi';
}

const resources = {
  vi: {
    translation: vi
  },
  en: {
    translation: en
  }
};

i18n
  .use(initReactI18next)
  .init({
    lng: detectInitialLanguage(),
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

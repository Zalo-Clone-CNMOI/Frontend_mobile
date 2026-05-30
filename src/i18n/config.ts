import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { findBestLanguageTag } from 'react-native-localize';

import en from './en.json';
import vi from './vi.json';

const SUPPORTED = ['vi', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED)[number];

/**
 * Pick the initial UI language from the device locale, restricted to the
 * languages we actually ship. Falls back to 'vi' on any failure (e.g. the
 * native module is unavailable in a test/headless context). A saved user
 * choice, when present, overrides this later via initializeLanguage() in
 * ./index.ts — so device detection only decides the FIRST-run default.
 */
function detectInitialLanguage(): SupportedLanguage {
  try {
    const best = findBestLanguageTag([...SUPPORTED]);
    const code = best?.languageTag?.split('-')[0]?.toLowerCase();
    if (code && (SUPPORTED as readonly string[]).includes(code)) {
      return code as SupportedLanguage;
    }
  } catch {
    // Native locale module not available — use the fallback below.
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

const i18n = createInstance();

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

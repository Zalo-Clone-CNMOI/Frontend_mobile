import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from './config';

const LANGUAGE_KEY = '@app_language';

// Initialize with saved language (only when called, not at top-level)
export const initializeLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.log('Error loading language from AsyncStorage:', error);
  }
};

export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.log('Error saving language to AsyncStorage:', error);
  }
};

export const getCurrentLanguage = () => i18n.language;

export { useTranslation };

export default i18n;


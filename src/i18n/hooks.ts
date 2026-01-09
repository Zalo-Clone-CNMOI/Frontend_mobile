import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEY = '@app_language';

export const useAppTranslation = () => {
  return useTranslation();
};

export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export const getCurrentLanguage = () => i18n.language;

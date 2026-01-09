import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, initI18next } from './config';

// Initialize i18next
initI18next();

export { changeLanguage, getCurrentLanguage, useTranslation };


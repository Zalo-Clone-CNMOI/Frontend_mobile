import { changeLanguage, getCurrentLanguage } from '@/src/i18n';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

export function useWelcomeScreenLogic() {
  const [lang, setLang] = useState(getCurrentLanguage());
  const [showLangModal, setShowLangModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();

  const slideData = useMemo(
    () => [
      {
        id: 0,
        title: t('welcome.slide1_title'),
        subtitle: t('welcome.slide1_subtitle'),
        image: { source: require('../../assets/image/react-logo.png') },
      },
      {
        id: 1,
        title: t('welcome.slide2_title'),
        subtitle: t('welcome.slide2_subtitle'),
        image: { source: require('../../assets/image/react-logo.png') },
      },
      {
        id: 2,
        title: t('welcome.slide3_title'),
        subtitle: t('welcome.slide3_subtitle'),
        image: { source: require('../../assets/image/react-logo.png') },
      },
    ],
    [t],
  );

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const languages = useMemo(
    () => [
      { id: 'vi', label: 'Tieng Viet' },
      { id: 'en', label: 'English' },
    ],
    [],
  );

  const slideCount = slideData.length;

  const handleLanguageChange = useCallback(async (languageId: string) => {
    try {
      await changeLanguage(languageId);
      setLang(languageId);
      setShowLangModal(false);
    } catch (error) {
    }
  }, []);

  const currentSlide = slideData[activeIndex];

  return {
    activeIndex,
    currentSlide,
    fadeAnim,
    handleLanguageChange,
    lang,
    languages,
    setActiveIndex,
    setShowLangModal,
    showLangModal,
    slideCount,
    slideData,
  };
}

import { useRouter } from 'expo-router';
import { Check, ChevronDown } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';

export default function WelcomeScreen() {
  const router = useRouter();
  const [lang, setLang] = useState(getCurrentLanguage()); // 'vi' | 'en'
  const [showLangModal, setShowLangModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();

  // Dữ liệu slide đa ngôn ngữ
  const SLIDE_DATA = [
    {
      id: 0,
      title: t('welcome.slide1_title'),
      subtitle: t('welcome.slide1_subtitle'),
      image: { source: require('../../src/assets/image/react-logo.png') },
    },
    {
      id: 1,
      title: t('welcome.slide2_title'),
      subtitle: t('welcome.slide2_subtitle'),
      image: { source: require('../../src/assets/image/react-logo.png') },
    },
    {
      id: 2,
      title: t('welcome.slide3_title'),
      subtitle: t('welcome.slide3_subtitle'),
      image: { source: require('../../src/assets/image/react-logo.png') },
    }
  ]

  // Hiệu ứng mờ dần khi chuyển slide
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const languages = [
    { id: 'vi', label: 'Tiếng Việt' },
    { id: 'en', label: 'English' },
  ];

  // Xử lý thay đổi ngôn ngữ
  const handleLanguageChange = async (languageId: string) => {
    try {
      await changeLanguage(languageId);
      setLang(languageId);
      setShowLangModal(false);
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  // Logic tự động chuyển slide sau 3 giây
  useEffect(() => {
    const interval = setInterval(() => {
      // Hiệu ứng Fade Out
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setActiveIndex((prev) => (prev === SLIDE_DATA.length - 1 ? 0 : prev + 1));
        // Hiệu ứng Fade In
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const currentSlide = SLIDE_DATA[activeIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Nút chọn ngôn ngữ góc trên */}
      <TouchableOpacity
        style={styles.langPicker}
        onPress={() => setShowLangModal(true)}
      >
        <Text style={styles.langText}>
          {languages.find(l => l.id === lang)?.label}
        </Text>
        <ChevronDown size={16} color="#000" />
      </TouchableOpacity>

      {/* Modal chọn ngôn ngữ */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowLangModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('welcome.select_language')}</Text>
              {languages.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.langOption}
                  onPress={() => handleLanguageChange(item.id)}
                >
                  <Text style={[styles.optionText, lang === item.id && styles.activeOptionText]}>
                    {item.label}
                  </Text>
                  {lang === item.id && <Check size={18} color="#0091ff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Nội dung chính */}
      <View style={styles.content}>
        <Text style={styles.logoText}>Zalo</Text>

        <Animated.View style={[styles.illustrationBox, { opacity: fadeAnim }]}>
          <Image source={currentSlide.image.source } style={styles.image} resizeMode="contain" />
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </Animated.View>

        {/* Chỉ báo Dots */}
        <View style={styles.dotsContainer}>
          {SLIDE_DATA.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.activeDot]}
            />
          ))}
        </View>
      </View>

      {/* Nút điều hướng */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/(auth)/loginStep1')}
        >
          <Text style={styles.loginText}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerBtn} onPress={() => { router.push('/(auth)/register') }}>
          <Text style={styles.registerText}>{t('auth.register')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  langPicker: { flexDirection: 'row', alignSelf: 'flex-end', padding: 16, alignItems: 'center', gap: 4 },
  langText: { fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#333' },
  activeOptionText: { color: '#0091ff', fontWeight: '700' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 48, color: '#0091ff', fontWeight: 'bold', marginBottom: 20 },
  illustrationBox: { alignItems: 'center', paddingHorizontal: 40 },
  image: { width: 250, height: 200 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 30 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 20 },

  dotsContainer: { flexDirection: 'row', gap: 8, marginTop: 40, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eee' },
  activeDot: { backgroundColor: '#0091ff', width: 18 }, // Dot đang chọn dài hơn

  buttonContainer: { padding: 20, gap: 12, marginBottom: 10 },
  loginBtn: { backgroundColor: '#0091ff', padding: 16, borderRadius: 30, alignItems: 'center' },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerBtn: { backgroundColor: '#f1f2f4', padding: 16, borderRadius: 30, alignItems: 'center' },
  registerText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
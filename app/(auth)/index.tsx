import { useWelcomeScreenLogic } from '@/src/hooks/screens/useWelcomeScreen';
import { useRouter } from 'expo-router';
import { Check, ChevronDown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
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
  } = useWelcomeScreenLogic();

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setActiveIndex((prev) => (prev === slideCount - 1 ? 0 : prev + 1));
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, setActiveIndex, slideCount]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.langPicker} onPress={() => setShowLangModal(true)}>
        <Text style={styles.langText}>{languages.find((l) => l.id === lang)?.label}</Text>
        <ChevronDown size={16} color="#000" />
      </TouchableOpacity>

      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowLangModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('welcome.select_language')}</Text>
              {languages.map((item) => (
                <TouchableOpacity key={item.id} style={styles.langOption} onPress={() => handleLanguageChange(item.id)}>
                  <Text style={[styles.optionText, lang === item.id && styles.activeOptionText]}>{item.label}</Text>
                  {lang === item.id ? <Check size={18} color="#0091ff" /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.content}>
        <Text style={styles.logoText}>Zalo</Text>

        <Animated.View style={[styles.illustrationBox, { opacity: fadeAnim }]}>
          <Image source={currentSlide.image.source} style={styles.image} resizeMode="contain" />
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </Animated.View>

        <View style={styles.dotsContainer}>
          {slideData.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/loginStep1')}>
          <Text style={styles.loginText}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/(auth)/register')}>
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
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
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
  activeDot: { backgroundColor: '#0091ff', width: 18 },

  buttonContainer: { padding: 20, gap: 12, marginBottom: 10 },
  loginBtn: { backgroundColor: '#0091ff', padding: 16, borderRadius: 30, alignItems: 'center' },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerBtn: { backgroundColor: '#f1f2f4', padding: 16, borderRadius: 30, alignItems: 'center' },
  registerText: { color: '#000', fontSize: 16, fontWeight: '700' },
});

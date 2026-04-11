import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changeLanguage, getCurrentLanguage } from '../src/i18n';
import { useTheme } from '../src/theme/themeContext';
import { useThemeManager } from '../src/theme/themeManager';
import { StatusBar } from 'expo-status-bar';

// FIX: Do not import CSS files. Use local assets or remote URLs.
const VIETNAM_FLAG = { uri: 'https://flagcdn.com/w80/vn.png' };
const USA_FLAG = { uri: 'https://flagcdn.com/w80/us.png' };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const lightThemeImage = require('../src/assets/image/ligthTheme.png');
const darkThemeImage = require('../src/assets/image/darkTheme.png');

const ZALO_BLUE = '#0091ff';

export default function AppearanceScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeManager();
  const theme = useTheme();
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [language, setLanguage] = useState('vi');

  useEffect(() => {
    const loadLanguage = async () => {
      const currentLang = getCurrentLanguage();
      setLanguage(currentLang);
    };
    loadLanguage();
  }, []);

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await changeLanguage(newLanguage);
      setLanguage(newLanguage);
      setIsExpanded(false);
    } catch (error) {
    }
  };

  const LanguageOption = ({ label, active, onPress, flagSource }: any) => (
    <TouchableOpacity
      style={[
        styles.langBoxItem,
        active && styles.langBoxActive,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
      onPress={onPress}
    >
      <Image source={flagSource} style={styles.flagCircle} />
      <Text style={[styles.langBoxLabel, { color: theme.colors.text }]}>
        {label === 'vi' ? t('appearance.vietnamese') : t('appearance.english')}
      </Text>
      <View style={[styles.radioOuter, active && styles.radioActive]}>
        {active && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );

  const ThemeOption = ({ label, active, onPress, image }: any) => (
    <TouchableOpacity style={styles.themeItem} onPress={onPress}>
      <View style={[styles.previewBox, active && styles.previewBoxActive]}>
        <Image source={image} style={styles.imagePreview} resizeMode="cover" />
      </View>
      <View style={styles.radioContainer}>
        <View style={[styles.radioOuter, active && styles.radioActive]}>
          {active && <View style={styles.radioInner} />}
        </View>
        <Text style={[styles.themeLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  const toggleLangExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      
      <View style={[styles.header, { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }, { backgroundColor: theme.colors.statusBar }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>{t('appearance.title')}</Text>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: ZALO_BLUE }]}>{t('appearance.theme')}</Text>
            <View style={styles.themeContainer}>
              <ThemeOption
                label={t('appearance.theme_light')}
                active={themeMode === 'light'}
                onPress={() => setThemeMode('light')}
                image={lightThemeImage}
              />
              <ThemeOption
                label={t('appearance.theme_dark')}
                active={themeMode === 'dark'}
                onPress={() => setThemeMode('dark')}
                image={darkThemeImage}
              />
            </View>
          </View>

          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: ZALO_BLUE }]}>{t('appearance.language')}</Text>
          </View>

          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.colors.border }}>
            <TouchableOpacity
              style={[styles.menuRow, { backgroundColor: theme.colors.card }]}
              onPress={toggleLangExpanded}
            >
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{t('appearance.change_language')}</Text>
              <View style={styles.menuRight}>
                {!isExpanded && (
                  <View style={styles.langTag}>
                    <Image
                      source={language === 'vi' ? VIETNAM_FLAG : USA_FLAG}
                      style={[styles.flagPlaceholder]}
                    />
                    <Text style={styles.langText}>
                      {language === 'vi' ? t('appearance.vietnamese') : t('appearance.english')}
                    </Text>
                  </View>
                )}
                {isExpanded ? <ChevronDown size={20} color={theme.colors.text} /> : <ChevronRight size={20} color={theme.colors.text} />}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={[styles.langBoxContainer, { backgroundColor: theme.colors.background }]}>
                <LanguageOption
                  label="vi"
                  active={language === 'vi'}
                  onPress={() => handleLanguageChange('vi')}
                  flagSource={VIETNAM_FLAG}
                />
                <LanguageOption
                  label="en"
                  active={language === 'en'}
                  onPress={() => handleLanguageChange('en')}
                  flagSource={USA_FLAG}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  themeContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  themeItem: { alignItems: 'center', gap: 10 },
  previewBox: {
    width: 110,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#eee'
  },
  previewBoxActive: { borderColor: ZALO_BLUE },
  imagePreview: { width: '100%', height: '100%' },
  radioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#888',
    alignItems: 'center', justifyContent: 'center'
  },
  radioActive: { borderColor: ZALO_BLUE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ZALO_BLUE },
  themeLabel: { fontSize: 14, fontWeight: '500' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuTitle: { fontSize: 16 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langText: { color: '#8e8e93', fontSize: 14 },
  flagPlaceholder: { width: 24, height: 16, borderRadius: 2 },
  langBoxContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  langBoxItem: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  langBoxActive: { borderColor: ZALO_BLUE },
  flagCircle: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  langBoxLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
});
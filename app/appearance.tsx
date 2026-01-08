import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Kích hoạt animation mượt mà cho Android khi mở rộng Box
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const lightThemeImage = require('../src/assets/image/ligthTheme.png');
const darkThemeImage = require('../src/assets/image/darkTheme.png');

const ZALO_BLUE = '#0091ff';

export default function AppearanceScreen() {
  const router = useRouter();
  
  const [isExpended, setIsExpended] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('vi');

  useEffect(() => {
    // Give time for stores to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);


  const toggleLangExpended = () => {
    // Tạo hiệu ứng chuyển động khi hiện Box
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpended(!isExpended);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{"Giao diện"}</Text>
      </View>

      <ScrollView>
        {/* Section Giao diện */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"Giao diện"}</Text>
          <View style={styles.themeContainer}>
            <ThemeOption 
              label={"Light"} 
              active={theme === 'light'} 
              onPress={() => setTheme('light')}
              image={lightThemeImage}
            />
            <ThemeOption 
              label={"dark"} 
              active={theme === 'dark'} 
              onPress={() => setTheme('dark')}
              image={darkThemeImage}
            />
          </View>
        </View>

        {/* Section Ngôn ngữ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"Ngôn ngữ"}</Text>
        </View>
        <View style={styles.optionsGroup}>
          <TouchableOpacity style={styles.menuRow} onPress={toggleLangExpended}>
            <Text style={styles.menuTitle}>{"Thay đổi ngôn ngữ"}</Text>
            <View style={styles.menuRight}>
              {/* Chỉ hiện Tag ngôn ngữ hiện tại khi chưa nhấn mở rộng */}
              {!isExpended && (
                <View style={styles.langTag}>
                  <View style={[styles.flagPlaceholder, { backgroundColor: language === 'vi' ? '#da251d' : '#00247d' }]} />
                  <Text style={styles.langText}>{language === 'vi' ? "vi" : "en"}</Text>
                </View>
              )}
              {isExpended ? <ChevronDown size={20} color="#555" /> : <ChevronRight size={20} color="#555" />}
            </View>
          </TouchableOpacity>

          {/* Danh sách Box ngôn ngữ hiện ra khi nhấn */}
          {isExpended && (
            <View style={styles.langBoxContainer}>
              <LanguageOption 
                label={"vi"}
                active={language === 'vi'}
                onPress={() => setLanguage('vi')}
                flagColor="#da251d"
              />
              <LanguageOption 
                label={"en"}
                active={language === 'en'}
                onPress={() => setLanguage('en')}
                flagColor="#00247d"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Component lựa chọn Ngôn ngữ dạng Box
const LanguageOption = ({ label, active, onPress, flagColor }: any) => (
  <TouchableOpacity 
    style={[styles.langBoxItem, active && styles.langBoxActive]} 
    onPress={onPress}
  >
    <View style={[styles.flagCircle, { backgroundColor: flagColor }]} />
    <Text style={styles.langBoxLabel}>{label}</Text>
    <View style={[styles.radioOuter, active && styles.radioActive]}>
      {active && <View style={styles.radioInner} />}
    </View>
  </TouchableOpacity>
);

const ThemeOption = ({ label, active, onPress , image}: any) => (
  <TouchableOpacity style={styles.themeItem} onPress={onPress}>
    <View style={[styles.previewBox, active && styles.previewBoxActive]}>
      <Image source={image} style={styles.imagePreview} resizeMode="cover" />
    </View>
    <View style={styles.radioContainer}>
      <View style={[styles.radioOuter, active && styles.radioActive]}>
        {active && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.themeLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { color: ZALO_BLUE, fontSize: 14, fontWeight: '700' },
  themeContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  themeItem: { alignItems: 'center', gap: 10 },
  previewBox: { 
    width: 100, 
    height: 120, 
    borderRadius: 8, 
    borderWidth: 2, 
    borderColor: 'transparent',
    overflow: 'hidden'
  },
  imagePreview: { width: '100%', height: '100%' },
  previewBoxActive: { borderColor: ZALO_BLUE },
  radioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: { 
    width: 18, height: 18, borderRadius: 9, 
    borderWidth: 2, borderColor: '#555', 
    alignItems: 'center', justifyContent: 'center' 
  },
  radioActive: { borderColor: ZALO_BLUE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ZALO_BLUE },
  themeLabel: { color: '#fff', fontSize: 14 },
  optionsGroup: { borderTopWidth: 0.5, borderTopColor: '#222' },
  menuRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16,
    backgroundColor: '#000'
  },
  menuTitle: { color: '#fff', fontSize: 16 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  langTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langText: { color: '#8e8e93', fontSize: 15 },
  flagPlaceholder: { width: 20, height: 14, borderRadius: 2 },
  
  // Style bổ sung cho phần Box ngôn ngữ
  langBoxContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 12, 
    backgroundColor: '#0a0a0a', // Nền tối hơn một chút để phân biệt
  },
  langBoxItem: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 12, 
    padding: 15, 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333'
  },
  langBoxActive: { borderColor: ZALO_BLUE },
  flagCircle: { width: 30, height: 30, borderRadius: 15, marginBottom: 8 },
  langBoxLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 },
});
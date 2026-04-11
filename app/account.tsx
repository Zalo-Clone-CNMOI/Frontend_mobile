import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronLeft, ChevronRight, Globe, Lock, Mail, Phone, QrCode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { changeLanguage, getCurrentLanguage } from '../src/i18n';
import { useProfileStore } from '../src/store/useProfileStore';
import { useTheme } from '../src/theme/themeContext';

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const initializeProfile = useProfileStore((state) => state.initializeProfile);

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setCurrentLang(lang);
    setModalVisible(false);
  };

  const AccountItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.accountItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.accountItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
          <Icon size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.accountItemText}>
          <Text style={[styles.accountItemTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.accountItemSubtitle, { color: '#8e8e93' }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {onPress && <ChevronRight size={20} color="#8e8e93" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      
      <View style={[styles.header, { borderBottomColor: theme.colors.border }, { backgroundColor: theme.colors.statusBar }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
            {t('account_security.title') || 'Tài khoản và bảo mật'}
          </Text>                </View>
      </View>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView style={styles.content}>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('account_security.account') || 'Tài khoản'}
            </Text>

            
            <TouchableOpacity
              style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push('/personalInfo')}
            >
              <Image
                source={{ uri: authUser?.avatarUrl || 'https://i.pravatar.cc/200?u=user-me' }}
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileSubtitle, { color: '#8e8e93' }]}>
                  {t('account_security.personal_info') || 'Thông tin cá nhân'}
                </Text>
                <Text style={[styles.profileName, { color: theme.colors.text }]}>
                  {authUser?.name || ""}
                </Text>
              </View>
              <ChevronRight size={20} color="#8e8e93" />
            </TouchableOpacity>

            
            <View style={[styles.accountList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <AccountItem
                icon={Phone}
                title={t('account_security.phone_number') || 'Số điện thoại'}
                subtitle={authUser?.phone
                  ? `(+84) ${authUser.phone.replace(/^\+?84/, '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`
                  : ''}
              />
              <AccountItem
                icon={Mail}
                title={t('account_security.email') || 'Email'}
                subtitle={authUser?.email || ''}
              />
              <AccountItem
                icon={QrCode}
                title={t('account_security.my_qr_code') || 'Mã QR của tôi'}
                onPress={() => router.push('/scanner')}
              />
              <AccountItem
                icon={Globe}
                title={t('appearance.language')}
                subtitle={currentLang === 'vi' ? t('appearance.vietnamese') : t('appearance.english')}
                onPress={() => setModalVisible(true)}
              />
            </View>
          </View>

          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('account_security.security') || 'Bảo mật'}
            </Text>

            
            <View style={[styles.accountList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <AccountItem
                icon={Lock}
                title={t('account_security.password') || 'Mật khẩu'}
                onPress={() => router.push('/changePassword')}
              />
            </View>
          </View>
        </ScrollView>

        
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('appearance.language')}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <X size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.langOption, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleLanguageChange('vi')}
                  >
                    <Text style={[styles.langText, { color: theme.colors.text }]}>{t('appearance.vietnamese')}</Text>
                    {currentLang === 'vi' && <Check size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.langOption}
                    onPress={() => handleLanguageChange('en')}
                  >
                    <Text style={[styles.langText, { color: theme.colors.text }]}>{t('appearance.english')}</Text>
                    {currentLang === 'en' && <Check size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
  },
  accountList: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountItemText: {
    flex: 1,
  },
  accountItemTitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  accountItemSubtitle: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  langText: {
    fontSize: 16,
  },
});


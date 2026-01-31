import { useTheme } from '@/src/theme/themeContext';
import { ChevronRight, Eye, EyeOff, Pin, Phone, Settings, Clock, AlertTriangle, UserX, PieChart, Trash2, Users, UserPlus, User, Search, PaintRoller, Bell, BellOff, Languages, Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Switch,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changeLanguage, getCurrentLanguage } from '@/src/i18n';

interface ChatOptionsProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  chatAvatar?: string;
}

// Mock media data
const MOCK_MEDIA = [
  { id: '1', type: 'image', uri: 'https://i.pravatar.cc/200?u=chat1', thumbnail: 'https://i.pravatar.cc/200?u=chat1' },
  { id: '2', type: 'image', uri: 'https://i.pravatar.cc/200?u=chat2', thumbnail: 'https://i.pravatar.cc/200?u=chat2' },
  { id: '3', type: 'video', uri: 'https://i.pravatar.cc/200?u=video1', thumbnail: 'https://i.pravatar.cc/200?u=video1' },
  { id: '4', type: 'video', uri: 'https://i.pravatar.cc/200?u=video2', thumbnail: 'https://i.pravatar.cc/200?u=video2' },
];

export function ChatOptions({ visible, onClose, chatId, chatName, chatAvatar }: ChatOptionsProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  
  
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reportCalls, setReportCalls] = useState(true);
  const [bestFriend, setBestFriend] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('vi');

  // Load current language when component mounts
  useEffect(() => {
    if (visible) {
      const lang = getCurrentLanguage();
      setCurrentLanguage(lang);
    }
  }, [visible]);

  // Handle language change
  const handleLanguageChange = async (language: string) => {
    try {
      await changeLanguage(language);
      setCurrentLanguage(language);
      setShowLanguageModal(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const renderMediaItem = ({ item }: any) => (
    <View style={styles.mediaItem}>
      {item.type === 'video' && (
        <View style={styles.playIconContainer}>
          <View style={styles.playIcon} />
        </View>
      )}
      <Image source={{ uri: item.thumbnail }} style={styles.mediaThumbnail} />
    </View>
  );

  const OptionItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    showToggle = false,
    toggleValue = false,
    onToggleChange,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    showToggle?: boolean;
    toggleValue?: boolean;
    onToggleChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity
      style={[styles.optionItem, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
      onPress={showToggle ? undefined : onPress}
      activeOpacity={showToggle ? 1 : 0.7}
    >
      <View style={styles.optionLeft}>
        <Icon size={22} color={theme.colors.primary} />
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.optionSubtitle, { color: '#8e8e93' }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: '#e5e5ea', true: theme.colors.primary }}
          thumbColor="#fff"
        />
      ) : showArrow && (
        <ChevronRight size={20} color="#8e8e93" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: theme.colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('chat_options.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Image
              source={{ uri: chatAvatar || 'https://i.pravatar.cc/150?u=default' }}
              style={styles.profileAvatar}
            />
            <Text style={[styles.profileName, { color: theme.colors.text }]}>{chatName}</Text>
            
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Search size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.search_messages')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <User size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.profile')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <PaintRoller size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.change_wallpaper')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionItem} 
                onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  {notificationsEnabled ? (
                    <Bell size={24} color={theme.colors.primary} />
                  ) : (
                    <BellOff size={24} color={theme.colors.primary} />
                  )}
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.disable_notifications')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Options */}
          <View style={[styles.additionalOptions, { backgroundColor: theme.colors.background }]}>
            <OptionItem
              icon={Settings}
              title={t('chat_options.change_nickname')}
              onPress={() => {}}
            />
            <OptionItem
              icon={Pin}
              title={t('chat_options.mark_best_friend')}
              showToggle
              toggleValue={bestFriend}
              onToggleChange={setBestFriend}
            />
            <OptionItem
              icon={Clock}
              title={t('chat_options.shared_timeline')}
              onPress={() => {}}
            />
            <OptionItem
              icon={Languages}
              title={t('chat_options.language')}
              subtitle={currentLanguage === 'vi' ? t('appearance.vietnamese') : t('appearance.english')}
              onPress={() => setShowLanguageModal(true)}
            />
          </View>

          {/* Media Section */}
          <View style={[styles.mediaSectionHeader, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.mediaSectionTitle, { color: theme.colors.text }]}>{t('chat_options.media_files_links')}</Text>
            <ChevronRight size={18} color="#8e8e93" />
          </View>
          <View style={styles.mediaSection}>
            <FlatList
              data={MOCK_MEDIA}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderMediaItem}
              contentContainerStyle={styles.mediaList}
            />
          </View>

          {/* Options List */}
          <View style={[styles.optionsSection, { backgroundColor: theme.colors.background }]}>
            <OptionItem
              icon={Users}
              title={t('chat_options.create_group_with', { name: chatName })}
              onPress={() => {}}
            />
            <OptionItem
              icon={UserPlus}
              title={t('chat_options.add_to_group', { name: chatName })}
              onPress={() => {}}
            />
            <OptionItem
              icon={Users}
              title={t('chat_options.view_shared_groups', { count: 2 })}
              onPress={() => {}}
            />
            <OptionItem
              icon={Pin}
              title={t('chat_options.pin_conversation')}
              showToggle
              toggleValue={pinned}
              onToggleChange={setPinned}
            />
            <OptionItem
              icon={EyeOff}
              title={t('chat_options.hide_conversation')}
              showToggle
              toggleValue={hidden}
              onToggleChange={setHidden}
            />
            <OptionItem
              icon={Phone}
              title={t('chat_options.report_calls')}
              showToggle
              toggleValue={reportCalls}
              onToggleChange={setReportCalls}
            />
            <OptionItem
              icon={Settings}
              title={t('chat_options.personal_settings')}
              onPress={() => {}}
            />
            <OptionItem
              icon={Clock}
              title={t('chat_options.auto_delete_messages')}
              subtitle={t('chat_options.no_auto_delete')}
              onPress={() => {}}
            />
            <OptionItem
              icon={AlertTriangle}
              title={t('chat_options.report')}
              onPress={() => {}}
            />
            <OptionItem
              icon={UserX}
              title={t('chat_options.manage_block')}
              onPress={() => {}}
            />
            <OptionItem
              icon={PieChart}
              title={t('chat_options.conversation_storage')}
              onPress={() => {}}
            />
            <OptionItem
              icon={Trash2}
              title={t('chat_options.delete_history')}
              onPress={() => {}}
            />
          </View>
        </ScrollView>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowLanguageModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {t('appearance.change_language')}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      currentLanguage === 'vi' && [styles.languageOptionActive, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }],
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => handleLanguageChange('vi')}
                  >
                    <Image
                      source={{ uri: 'https://flagcdn.com/w80/vn.png' }}
                      style={styles.flagImage}
                    />
                    <Text style={[styles.languageText, { color: theme.colors.text }]}>
                      {t('appearance.vietnamese')}
                    </Text>
                    {currentLanguage === 'vi' && (
                      <Check size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      currentLanguage === 'en' && [styles.languageOptionActive, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }],
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => handleLanguageChange('en')}
                  >
                    <Image
                      source={{ uri: 'https://flagcdn.com/w80/us.png' }}
                      style={styles.flagImage}
                    />
                    <Text style={[styles.languageText, { color: theme.colors.text }]}>
                      {t('appearance.english')}
                    </Text>
                    {currentLanguage === 'en' && (
                      <Check size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 8,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
  additionalOptions: {
    marginTop: 8,
    marginBottom: 8,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  mediaSection: {
    paddingVertical: 16,
  },
  mediaList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  mediaItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  optionsSection: {
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  languageOptionActive: {
    borderWidth: 2,
  },
  flagImage: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  languageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
import { useTheme } from '@/src/theme/themeContext';
import { ChevronRight, Eye, EyeOff, Pin, Phone, Settings, Clock, AlertTriangle, UserX, PieChart, Trash2, Users, UserPlus, User, Search, PaintRoller, Bell, BellOff } from 'lucide-react-native';
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Tuỳ chọn</Text>
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
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Tìm tin nhắn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <User size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Trang cá nhân</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
                <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <PaintRoller size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Đổi hình nền</Text>
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
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Tắt thông báo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Options */}
          <View style={[styles.additionalOptions, { backgroundColor: theme.colors.background }]}>
            <OptionItem
              icon={Settings}
              title="Đổi tên gợi nhớ"
              onPress={() => {}}
            />
            <OptionItem
              icon={Pin}
              title="Đánh dấu bạn thân"
              showToggle
              toggleValue={bestFriend}
              onToggleChange={setBestFriend}
            />
            <OptionItem
              icon={Clock}
              title="Nhật ký chung"
              onPress={() => {}}
            />
          </View>

          {/* Media Section */}
          <View style={[styles.mediaSectionHeader, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.mediaSectionTitle, { color: theme.colors.text }]}>Ảnh, file, link</Text>
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
              title={`Tạo nhóm với ${chatName}`}
              onPress={() => {}}
            />
            <OptionItem
              icon={UserPlus}
              title={`Thêm ${chatName} vào nhóm`}
              onPress={() => {}}
            />
            <OptionItem
              icon={Users}
              title="Xem nhóm chung (2)"
              onPress={() => {}}
            />
            <OptionItem
              icon={Pin}
              title="Ghim trò chuyện"
              showToggle
              toggleValue={pinned}
              onToggleChange={setPinned}
            />
            <OptionItem
              icon={EyeOff}
              title="Ẩn trò chuyện"
              showToggle
              toggleValue={hidden}
              onToggleChange={setHidden}
            />
            <OptionItem
              icon={Phone}
              title="Báo cuộc gọi đến"
              showToggle
              toggleValue={reportCalls}
              onToggleChange={setReportCalls}
            />
            <OptionItem
              icon={Settings}
              title="Cài đặt cá nhân"
              onPress={() => {}}
            />
            <OptionItem
              icon={Clock}
              title="Tin nhắn tự xóa"
              subtitle="Không tự xóa"
              onPress={() => {}}
            />
            <OptionItem
              icon={AlertTriangle}
              title="Báo xấu"
              onPress={() => {}}
            />
            <OptionItem
              icon={UserX}
              title="Quản lý chặn"
              onPress={() => {}}
            />
            <OptionItem
              icon={PieChart}
              title="Dung lượng trò chuyện"
              onPress={() => {}}
            />
            <OptionItem
              icon={Trash2}
              title="Xóa lịch sử trò chuyện"
              onPress={() => {}}
            />
          </View>
        </ScrollView>
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
});


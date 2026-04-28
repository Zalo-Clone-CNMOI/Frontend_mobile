import { ChatListItem } from '@/src/components/chat/ChatListItem';
import { ChatSearchHeader } from '@/src/components/chat/ChatSearchHeader';
// ✅ FIX 2: Xóa useChatSocket import vì đã deprecated, ChatSocketBridge xử lý socket
import { useHomeScreenLogic } from '@/src/hooks/screens/useHomeScreen';
import { useGroupInviteStore } from '@/src/store/useGroupInviteStore';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useTheme } from '@/src/theme/themeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Filter, MailOpen, Pin, PinOff, FolderInput, MessageSquare, X, User, LogOut } from 'lucide-react-native';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import * as Haptics from 'expo-haptics';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View, Modal, Pressable, ActionSheetIOS, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pinConversation, unpinConversation, leaveConversation } from '@/src/services/conversationsApi';
import { toast } from '@/src/services/toastService';
import type { ConversationV2 } from '@/src/types/chat';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MENU_HEIGHT_ESTIMATE = 200; // Estimate height of menu + conversation preview
const BOTTOM_SAFE_AREA = 80; // Bottom navigation + safe area

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { listData, onRefresh, openChat, refreshing } = useHomeScreenLogic();
  const pendingInvitesCount = useGroupInviteStore((state) => state.unreadCount);
  const updateConversationPinStatus = useChatsStore((state) => state.updateConversationPinStatus);

  // State for conversation action menu
  const [selectedConversation, setSelectedConversation] = useState<ConversationV2 | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pressedConversationId, setPressedConversationId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ y: number; height: number }>({ y: 0, height: 0 });
  const [menuFlip, setMenuFlip] = useState(false); // true = show menu above conversation

  // Handle long press on conversation
  const handleConversationLongPress = useCallback((conversation: ConversationV2, yPosition: number, itemHeight: number) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if menu would go off screen at bottom
    const wouldOverflow = (yPosition + itemHeight + MENU_HEIGHT_ESTIMATE) > (SCREEN_HEIGHT - BOTTOM_SAFE_AREA);
    setMenuFlip(wouldOverflow);

    // Adjust position if flipping
    const adjustedY = wouldOverflow
      ? Math.max(20, yPosition - MENU_HEIGHT_ESTIMATE + itemHeight) // Show above with padding
      : yPosition;

    setSelectedConversation(conversation);
    setPressedConversationId(conversation.conversationId);
    setMenuPosition({ y: adjustedY, height: itemHeight });

    if (Platform.OS === 'ios') {
      // Use native ActionSheet on iOS
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            conversation.pinned ? (t('chat_options.unpin') || 'Bỏ ghim') : (t('chat_options.pin') || 'Ghim hội thoại'),
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: undefined,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await toggleConversationPin(conversation);
          }
          setSelectedConversation(null);
          setPressedConversationId(null);
        }
      );
    } else {
      // Use custom modal on Android
      setMenuVisible(true);
    }
  }, [t]);

  // Toggle pin status
  const toggleConversationPin = async (conversation: ConversationV2) => {
    try {
      if (conversation.pinned) {
        await unpinConversation(conversation.conversationId);
        updateConversationPinStatus(conversation.conversationId, false);
        toast.success(t('chat_options.unpin_success') || 'Đã bỏ ghim hội thoại');
      } else {
        await pinConversation(conversation.conversationId);
        updateConversationPinStatus(conversation.conversationId, true);
        toast.success(t('chat_options.pin_success') || 'Đã ghim hội thoại');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể thực hiện thao tác');
    }
  };

  // Handle leave conversation
  const handleLeaveConversation = async () => {
    if (!selectedConversation) return;
    
    try {
      await leaveConversation(selectedConversation.conversationId);
      toast.success(t('conversation.leave_success') || 'Đã rời hội thoại');
      handleCloseMenu();
      // Refresh conversation list
      onRefresh();
    } catch (error) {
      toast.error(t('conversation.leave_error') || 'Không thể rời hội thoại');
    }
  };

  // Format last message to match ChatListItem style
  const formatLastMessage = (conversation: ConversationV2, currentUserId?: string) => {
    const type = conversation.lastMessage?.type || 'text';
    const content = conversation.lastMessage?.content;
    const senderId = (conversation.lastMessage as any)?.senderId;
    const fromMe = senderId ? senderId === currentUserId : false;

    // Determine content based on type
    let messageContent = '';
    switch (type) {
      case 'image':
        messageContent = t('message.sent_image') || 'đã gửi ảnh';
        break;
      case 'video':
        messageContent = t('message.sent_video') || 'đã gửi video';
        break;
      case 'file':
        messageContent = t('message.sent_file') || 'đã gửi tệp';
        break;
      case 'voice':
        messageContent = t('message.sent_voice') || 'đã gửi tin nhắn thoại';
        break;
      case 'poll':
        messageContent = content || (t('message.poll') || 'Bình chọn');
        break;
      default:
        messageContent = content || '';
    }

    // Determine prefix based on sender and chat type
    let prefix = '';
    if (fromMe) {
      prefix = (t('common.you') || 'Bạn') + ': ';
    } else {
      const senderName = (conversation.lastMessage as any)?.senderName || '';
      prefix = senderName ? `${senderName}: ` : '';
    }

    return prefix + messageContent || (t('message.no_message') || 'Không có tin nhắn');
  };

  // Close menu
  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedConversation(null);
    setPressedConversationId(null);
    setMenuPosition({ y: 0, height: 0 });
  };

  // Handle pin action from custom menu
  const handlePinAction = async () => {
    if (selectedConversation) {
      await toggleConversationPin(selectedConversation);
    }
    handleCloseMenu();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ChatSearchHeader onPressSearch={() => router.push('/search')} />

        <View style={[styles.filterContainer, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.activeTabContainer}>
            <Text style={[styles.activeTabText, { color: theme.colors.text }]}>{t('messages.title')}</Text>
            <View style={[styles.activeLine, { backgroundColor: theme.colors.text }]} />
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              onPress={() => router.push('/inviteCenter')}
              style={styles.iconButton}
            >
            </TouchableOpacity>
            <Filter size={18} color="#8e8e93" style={{ marginLeft: 12 }} />
          </View>
        </View>

        <FlashList
          data={listData}
          keyExtractor={(item: any) => item.conversationId || item.id || item._id || ''}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text }}>{t('messages.empty')}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ChatListItem
              item={item}
              onPress={() => openChat(item)}
              onLongPress={(yPosition, height) => handleConversationLongPress(item, yPosition, height)}
              isPressed={pressedConversationId === item.conversationId}
            />
          )}
        />

        {/* Conversation Action Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseMenu}
        >
          <View style={menuStyles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseMenu} />

            {/* Floating Container positioned exactly at conversation location */}
            <View style={[menuStyles.floatingContainer, { top: menuPosition.y, left: 12, right: 12 }, menuFlip && { flexDirection: 'column-reverse' }]}>
              {/* Conversation Preview - always visible */}
              {selectedConversation && (
                <View style={[menuStyles.conversationPreview, { backgroundColor: theme.colors.background }]}>
                  {/* Avatar - show image if available, otherwise initials */}
                  {selectedConversation.avatar ? (
                    <Image source={{ uri: selectedConversation.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <AvatarWithInitials name={selectedConversation.name || '?'} size={48} />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 16 }}>
                      {selectedConversation.name || t('common.unknown') || 'Unknown'}
                    </Text>
                    <Text style={{ color: theme.colors.icon, fontSize: 14 }}>
                      {formatLastMessage(selectedConversation, authUser?.id)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[menuStyles.menuContainer, { backgroundColor: theme.colors.background }]}>
                {/* Pin/Unpin Option */}
                <TouchableOpacity style={menuStyles.menuItem} onPress={handlePinAction}>
                  {selectedConversation?.pinned ? (
                    <>
                      <PinOff size={22} color={theme.colors.text} />
                      <Text style={[menuStyles.menuText, { color: theme.colors.text }]}>
                        {t('chat_options.unpin') || 'Bỏ ghim'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Pin size={22} color={theme.colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                      <Text style={[menuStyles.menuText, { color: theme.colors.text }]}>
                        {t('chat_options.pin') || 'Ghim hội thoại'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Move to Other Category */}
                {/* <TouchableOpacity style={menuStyles.menuItem} onPress={handleCloseMenu}>
                  <FolderInput size={20} color={theme.colors.text} />
                  <Text style={[menuStyles.menuText, { color: theme.colors.text }]}>
                    Chuyển sang mục Khác
                  </Text>
                </TouchableOpacity> */}

                <View style={[menuStyles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Leave Conversation Option - Only for group conversations */}
                {selectedConversation?.isGroup && (
                  <TouchableOpacity style={menuStyles.menuItem} onPress={handleLeaveConversation}>
                    <LogOut size={20} color={theme.colors.text} />
                    <Text style={[menuStyles.menuText, { color: theme.colors.text }]}>
                      {t('conversation.leave') || 'Rời hội thoại'}
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedConversation?.isGroup && <View style={[menuStyles.divider, { backgroundColor: theme.colors.border }]} />}

                {/* Chat Bubble Option */}
                {/* <TouchableOpacity style={menuStyles.menuItem} onPress={handleCloseMenu}>
                  <MessageSquare size={20} color={theme.colors.text} strokeWidth={1.5} />
                  <Text style={[menuStyles.menuText, { color: theme.colors.text }]}>
                    Bật bong bóng chat
                  </Text>
                </TouchableOpacity> */}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  activeTabContainer: { alignItems: 'flex-start' },
  activeTabText: { fontWeight: 'bold', fontSize: 15 },
  activeLine: { height: 2, marginTop: 4 },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  iconButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  floatingContainer: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 0,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  previewAvatarContainer: {
    marginRight: 12,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  previewMessage: {
    fontSize: 13,
  },
  previewTimeContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  previewTime: {
    fontSize: 12,
  },
  menuContainer: {
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
    opacity: 0.3,
  },
});

import { fetchConversations } from '@/src/services/chatService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { Check, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ForwardModalProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onForward: (message: ChatMessage, conversationIds: string[], optionalMessage?: string) => void;
}

export function ForwardModal({
  visible,
  message,
  onClose,
  onForward,
}: ForwardModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState<ChatMessage | null>(null);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [optionalMessage, setOptionalMessage] = useState('');

  // Store message locally when prop changes
  useEffect(() => {
    if (message) {
      setLocalMessage(message);
    }
  }, [message]);

  // Clear selections when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedConversationIds(new Set());
      setOptionalMessage('');
    }
  }, [visible]);

  // Fetch all conversations when modal opens
  useEffect(() => {
    if (visible) {
      loadConversations();
    }
  }, [visible]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const conversations = await fetchConversations();
      setAllConversations(conversations);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = allConversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessage = (item: any) => {
    const type = item.lastMessage?.type || 'text';
    const content = item.lastMessage?.content;
    const fromMe = (item.lastMessage as any)?.fromMe || false;
    const isGroup = item.isGroup;

    if (!content && !type) {
      return t('chat.no_messages', { defaultValue: 'Không có tin nhắn' });
    }

    // Determine content based on type
    let messageContent = '';
    switch (type) {
      case 'image':
        messageContent = 'đã gửi 1 ảnh';
        break;
      case 'video':
        messageContent = 'đã gửi 1 video';
        break;
      case 'file':
        messageContent = 'đã gửi 1 tệp';
        break;
      case 'voice':
        messageContent = 'đã gửi 1 tin nhắn thoại';
        break;
      default:
        messageContent = content || '';
    }

    // Determine prefix based on sender and chat type
    let prefix = '';
    if (fromMe) {
      prefix = 'Bạn: ';
    } else {
      // For both group and direct chats, show sender name
      const senderName = item.lastMessage?.senderName || '';
      prefix = senderName ? `${senderName}: ` : '';
    }

    return prefix + messageContent;
  };

  const handleForward = async () => {
    const messageToForward = localMessage || message;
    if (!messageToForward || selectedConversationIds.size === 0) {
      return;
    }
    onForward(messageToForward, Array.from(selectedConversationIds), optionalMessage);
    onClose();
    setSearchQuery('');
    setLocalMessage(null);
    setOptionalMessage('');
  };

  const toggleSelection = (conversationId: string) => {
    setSelectedConversationIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        if (next.size >= 20) {
          // Backend limit is 20 targets
          return prev;
        }
        next.add(conversationId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredChats.map((chat) => chat.conversationId).slice(0, 20);
    setSelectedConversationIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedConversationIds(new Set());
  };

  const isAllSelected = selectedConversationIds.size === filteredChats.length && filteredChats.length > 0;
  const isPartiallySelected = selectedConversationIds.size > 0 && !isAllSelected;

  const getAvatarSource = (chat: any) => {
    if (chat.avatar) {
      return { uri: chat.avatar };
    }
    const name = chat.name || 'User';
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=7F9CFB` };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: '#FFFFFF' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {t('chat.forward_to', { defaultValue: 'Chuyển tiếp' })}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#8e8e93" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('chat.search_friends_groups', { defaultValue: 'Tìm kiếm bạn bè, nhóm...' })}
              placeholderTextColor="#8e8e93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Message Preview */}
          {localMessage && (
            <View style={styles.messagePreviewSection}>
              <View style={styles.bubbleContainer}>
                {/* Header - Nguồn chuyển tiếp */}
                <View style={styles.previewHeader}>
                  <Text style={styles.fromText}>Từ</Text>
                  <Image
                    source={{ uri: localMessage.senderAvatar || 'https://i.pravatar.cc/100' }}
                    style={styles.previewAvatar}
                  />
                  <Text style={styles.senderName}>{localMessage.senderName || 'Người gửi'}</Text>
                  <Text style={styles.chevronIcon}>›</Text>
                </View>

                {/* Nội dung text */}
                <Text style={styles.mainLinkText} selectable>
                  {localMessage.text || ''}
                </Text>

                {/* Link Preview Card */}
                {localMessage.type === 'file' && (
                  <View style={styles.previewCard}>
                    <View style={styles.previewImageContainer}>
                      <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png' }}
                        style={styles.driveLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.driveLogoText}>Google Drive</Text>
                    </View>

                    <View style={styles.previewInfoContainer}>
                      <Text style={styles.domainText}>drive.google.com</Text>
                      <Text style={styles.fileNameText} numberOfLines={2}>
                        {localMessage.fileInfo?.name || 'File'}
                      </Text>
                      <Text style={styles.subLinkText} numberOfLines={3}>
                        {localMessage.text || ''}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Footer (Thời gian) */}
                <Text style={styles.timeText}>
                  {localMessage.timestamp ? new Date(localMessage.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>

                {/* Nút Thả tim */}
                <TouchableOpacity style={styles.reactionButton} activeOpacity={0.7}>
                  <Text style={{ fontSize: 12 }}>🤍</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selected Contacts Horizontal Scroll */}
          {selectedConversationIds.size > 0 && (
            <View style={styles.selectedContactsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedContactsContainer}
              >
                {allConversations
                  .filter((chat) => selectedConversationIds.has(chat.conversationId))
                  .map((chat) => (
                    <View key={chat.conversationId} style={styles.selectedContactItem}>
                      <Image source={getAvatarSource(chat)} style={styles.selectedContactAvatar} />
                      <TouchableOpacity
                        style={styles.removeSelectedButton}
                        onPress={() => toggleSelection(chat.conversationId)}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}

          {/* Contact List */}
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('common.loading', { defaultValue: 'Đang tải...' })}
              </Text>
            </View>
          ) : (
            <FlatList
              style={styles.contactList}
              data={filteredChats}
              keyExtractor={(item) => item.conversationId}
              renderItem={({ item }) => {
                const isSelected = selectedConversationIds.has(item.conversationId);
                return (
                  <TouchableOpacity
                    style={styles.chatItem}
                    onPress={() => toggleSelection(item.conversationId)}
                  >
                    <Image source={getAvatarSource(item)} style={styles.avatar} />
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {t('chat.no_conversations_found', { defaultValue: 'Không tìm thấy cuộc trò chuyện nào' })}
                  </Text>
                </View>
              }
            />
          )}

          {/* Optional Message Input */}
          <View style={styles.messageInputSection}>
            <TextInput
              style={styles.messageInput}
              placeholder={t('chat.enter_optional_message', { defaultValue: 'Nhập kèm tin nhắn...' })}
              placeholderTextColor="#8e8e93"
              multiline
              numberOfLines={3}
              value={optionalMessage}
              onChangeText={setOptionalMessage}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.selectedCount}>
              {t('chat.selected_count', { defaultValue: 'Đã chọn' })}: {selectedConversationIds.size}
            </Text>
            <TouchableOpacity
              onPress={handleForward}
              disabled={selectedConversationIds.size === 0}
              style={[styles.sendButton, selectedConversationIds.size > 0 && styles.sendButtonActive]}
            >
              <Text style={[styles.sendButtonText, selectedConversationIds.size > 0 && styles.sendButtonTextActive]}>
                {t('chat.send', { defaultValue: 'Gửi' })}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
  headerSpacer: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
    backgroundColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000000',
  },
  selectedContactsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedContactsContainer: {
    gap: 12,
  },
  selectedContactItem: {
    position: 'relative',
  },
  selectedContactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  removeSelectedButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0068FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0068FF',
    borderColor: '#0068FF',
  },
  messageInputSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messageInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedCount: {
    fontSize: 15,
    color: '#6B7280',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  sendButtonActive: {
    backgroundColor: '#0068FF',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  sendButtonTextActive: {
    color: '#FFFFFF',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  selectCountText: {
    fontSize: 13,
    color: '#8e8e93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  // Message Preview Styles (Zalo-style)
  messagePreviewSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bubbleContainer: {
    backgroundColor: '#D8F0FA',
    borderRadius: 12,
    padding: 12,
    width: '85%',
    alignSelf: 'flex-start',
    marginVertical: 8,
    position: 'relative',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  fromText: {
    fontSize: 14,
    color: '#555555',
    marginRight: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginRight: 4,
  },
  chevronIcon: {
    fontSize: 16,
    color: '#555555',
  },
  mainLinkText: {
    fontSize: 15,
    color: '#0068FF',
    lineHeight: 22,
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  previewImageContainer: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  driveLogo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  driveLogoText: {
    fontSize: 22,
    color: '#5f6368',
  },
  previewInfoContainer: {
    backgroundColor: '#C5E8F7',
    padding: 10,
  },
  domainText: {
    fontSize: 13,
    color: '#005bb5',
    marginBottom: 4,
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 4,
  },
  subLinkText: {
    fontSize: 13,
    color: '#7A7A7A',
    lineHeight: 18,
  },
  timeText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  reactionButton: {
    position: 'absolute',
    bottom: -10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});

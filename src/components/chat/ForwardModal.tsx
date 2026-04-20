import { fetchConversations } from '@/src/services/chatService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { ArrowLeft, Check, ChevronRight, File, Plus, Search, Send, Upload, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
    const attachments = (item.lastMessage as any)?.attachments || [];

    // Determine content based on type
    let messageContent = '';
    switch (type) {
      case 'image':
        // Check if multiple images
        const imageCount = attachments.filter((a: any) => a.type === 'image' || a.content_type?.startsWith('image/')).length;
        if (imageCount > 1) {
          messageContent = 'đã gửi nhiều ảnh';
        } else {
          messageContent = 'đã gửi 1 ảnh';
        }
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

  // Separate conversations into recent and groups
  const recentChats = filteredChats.filter((chat) => !chat.isGroup);
  const groupChats = filteredChats.filter((chat) => chat.isGroup);

  const getFileSize = (bytes: number | string) => {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (numBytes < 1024) return numBytes + ' B';
    if (numBytes < 1024 * 1024) return (numBytes / 1024).toFixed(0) + ' KB';
    return (numBytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: '#F5F5F5' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header Row 1: Back button, Title, Selected count */}
          <View style={styles.headerRow1}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Chia sẻ</Text>
              <Text style={styles.selectedCountHeader}>Đã chọn: {selectedConversationIds.size}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Header Row 2: Search Bar */}
          <View style={styles.headerRow2}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#8e8e93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm"
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Header Row 3: Quick Actions */}
          <View style={styles.headerRow3}>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Users size={24} color="#0068FF" />
                <Plus size={12} color="#0068FF" style={styles.plusIcon} />
              </View>
              <Text style={styles.quickActionText}>Nhóm mới</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={styles.quickActionIcon}>
                <Upload size={24} color="#0068FF" />
              </View>
              <Text style={styles.quickActionText}>App khác</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Body: Contact List with Sections */}
        <View style={styles.bodyContainer}>
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Đang tải...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Section 1: Gần đây (Recent) */}
              {recentChats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Gần đây</Text>
                  {recentChats.map((chat) => {
                    const isSelected = selectedConversationIds.has(chat.conversationId);
                    return (
                      <TouchableOpacity
                        key={chat.conversationId}
                        style={styles.contactRow}
                        onPress={() => toggleSelection(chat.conversationId)}
                      >
                        <Image source={getAvatarSource(chat)} style={styles.contactAvatar} />
                        <Text style={styles.contactName} numberOfLines={1}>
                          {chat.name}
                        </Text>
                        <View style={[styles.contactCheckbox, isSelected && styles.contactCheckboxSelected]}>
                          {isSelected && <Check size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.viewMoreButton}>
                    <Text style={styles.viewMoreText}>Xem thêm</Text>
                    <ChevronRight size={16} color="#8e8e93" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Section 2: Nhóm trò chuyện (Groups) */}
              {groupChats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nhóm trò chuyện</Text>
                  {groupChats.map((chat) => {
                    const isSelected = selectedConversationIds.has(chat.conversationId);
                    return (
                      <TouchableOpacity
                        key={chat.conversationId}
                        style={styles.contactRow}
                        onPress={() => toggleSelection(chat.conversationId)}
                      >
                        <Image source={getAvatarSource(chat)} style={styles.contactAvatar} />
                        <Text style={styles.contactName} numberOfLines={1}>
                          {chat.name}
                        </Text>
                        <View style={[styles.contactCheckbox, isSelected && styles.contactCheckboxSelected]}>
                          {isSelected && <Check size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {filteredChats.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy cuộc trò chuyện nào</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Footer: File Preview & Input */}
        <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
          {/* File Preview Box */}
          {localMessage && (
            <View style={styles.filePreviewBox}>
              <View style={styles.fileIconContainer}>
                <File size={24} color="#0068FF" />
              </View>
              <View style={styles.fileInfoContainer}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {localMessage.fileInfo?.name || 'Tin nhắn'}
                </Text>
                <Text style={styles.fileSize}>
                  {localMessage.fileInfo?.size ? getFileSize(localMessage.fileInfo.size) : '20 KB'}
                </Text>
              </View>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.messageInput}
              placeholder="Nhập tin nhắn"
              placeholderTextColor="#8e8e93"
              value={optionalMessage}
              onChangeText={setOptionalMessage}
            />
            <TouchableOpacity
              onPress={handleForward}
              disabled={selectedConversationIds.size === 0}
              style={[styles.sendButtonCircle, selectedConversationIds.size > 0 && styles.sendButtonCircleActive]}
            >
              <Send 
                size={20} 
                color={selectedConversationIds.size > 0 ? '#fff' : '#9CA3AF'} 
              />
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
    backgroundColor: '#FFFFFF',
  },
  // Header Row 1: Back button, Title, Selected count
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  selectedCountHeader: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  headerSpacer: {
    width: 32,
  },
  // Header Row 2: Search Bar
  headerRow2: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
    backgroundColor: '#F3F4F6',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  // Header Row 3: Quick Actions
  headerRow3: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  quickActionIcon: {
    position: 'relative',
    marginBottom: 4,
  },
  plusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#000000',
  },
  // Body Container
  bodyContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  // Contact Row
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  contactName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  contactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCheckboxSelected: {
    backgroundColor: '#0068FF',
    borderColor: '#0068FF',
  },
  // View More Button
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#0068FF',
    marginRight: 4,
  },
  // Footer Container
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // File Preview Box
  filePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfoContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 13,
    color: '#8e8e93',
  },
  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  sendButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonCircleActive: {
    backgroundColor: '#0068FF',
  },
  // Empty State
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
});

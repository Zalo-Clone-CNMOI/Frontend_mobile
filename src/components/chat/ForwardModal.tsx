import { fetchConversations } from '@/src/services/chatService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { ChevronRight, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ForwardModalProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onForward: (message: ChatMessage, conversationId: string) => void;
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

  // Store message locally when prop changes
  useEffect(() => {
    if (message) {
      setLocalMessage(message);
    }
  }, [message]);

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

  const handleForward = async (conversationId: string) => {
    const messageToForward = localMessage || message;
    if (!messageToForward) {
      return;
    }
    onForward(messageToForward, conversationId);
    onClose();
    setSearchQuery('');
    setLocalMessage(null);
  };

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('chat.forward_to', { defaultValue: 'Chuyển tiếp đến' })}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <Search size={20} color="#8e8e93" />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('chat.search_conversation', { defaultValue: 'Tìm kiếm cuộc trò chuyện' })}
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: '#8e8e93' }]}>
              {t('common.loading', { defaultValue: 'Đang tải...' })}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.conversationId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  handleForward(item.conversationId);
                }}
              >
                <Image source={getAvatarSource(item)} style={styles.avatar} />
                <View style={styles.chatInfo}>
                  <Text style={[styles.chatName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.chatLastMessage, { color: '#8e8e93' }]} numberOfLines={1}>
                    {formatLastMessage(item)}
                  </Text>
                </View>
                <ChevronRight size={20} color="#8e8e93" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: '#8e8e93' }]}>
                  {t('chat.no_conversations_found', { defaultValue: 'Không tìm thấy cuộc trò chuyện nào' })}
                </Text>
              </View>
            }
          />
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});

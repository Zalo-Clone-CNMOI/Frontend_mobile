import { useTheme } from '@/src/theme/themeContext';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import type { PinnedMessageItem } from '@/src/types/mappers/DTOMappers';
import { MessageCircle, ChevronDown } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PinnedPreviewBarProps {
  pinnedMessages: PinnedMessageItem[];
  onPress: () => void;
  conversationId?: string;
}

export const PinnedPreviewBar: React.FC<PinnedPreviewBarProps> = ({
  pinnedMessages,
  onPress,
  conversationId,
}) => {
  const theme = useTheme();
  const getMembers = useConversationDetailStore((state) => state.getMembers);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const latestMessage = pinnedMessages[0];
  const message = latestMessage.message;
  const messageText = message.text || '';
  const hasAttachments = message.attachments && message.attachments.length > 0;

  let previewText = messageText;
  if (!previewText) {
    if (hasAttachments) previewText = '📎 Tệp';
    else previewText = 'Tin nhắn';
  }

  const senderName = useMemo(() => {
    const senderId = message.senderId;
    if (!senderId || !conversationId) {
      return message.senderName || 'Người dùng';
    }
    // Get sender name from conversation members
    const members = getMembers(conversationId);
    const member = members?.find((m) => m.userId === senderId);
    return member?.nickname || member?.fullName || message.senderName || 'Người dùng';
  }, [message, conversationId, getMembers]);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
          <MessageCircle size={20} color={theme.colors.primary} strokeWidth={2} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.previewText, { color: theme.colors.text }]} numberOfLines={1}>
            {previewText}
          </Text>
          <Text style={[styles.subtitleText, { color: theme.colors.icon }]}>
            Tin nhắn của {senderName}
          </Text>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
      
      <TouchableOpacity style={styles.dropdownButton} onPress={onPress} hitSlop={8}>
        <ChevronDown size={20} color={theme.colors.icon} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '400',
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  dropdownButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

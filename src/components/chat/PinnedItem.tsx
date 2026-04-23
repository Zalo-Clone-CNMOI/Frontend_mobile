import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PinnedMessageItem {
  message: ChatMessage;
  pinnedBy: string;
  pinnedAt: number;
}

interface PinnedItemProps {
  item: PinnedMessageItem;
  onPress: (message: ChatMessage) => void;
  isHighlighted?: boolean;
}

export const PinnedItem: React.FC<PinnedItemProps> = ({
  item,
  onPress,
  isHighlighted = false,
}) => {
  const theme = useTheme();

  const message = item.message;
  const messageText = (message as any).body || message.text || '';
  const hasAttachments = message.attachments && message.attachments.length > 0;
  
  let previewText = messageText;
  if (!previewText) {
    if (hasAttachments) previewText = '📎 Tệp';
    else previewText = 'Tin nhắn';
  }
  
  const senderName = message.senderName || 'Người dùng';

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.card,
          borderWidth: isHighlighted ? 2 : 0,
          borderColor: isHighlighted ? theme.colors.primary : 'transparent',
        }
      ]}
      onPress={() => onPress(message)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
        <MessageCircle size={20} color={theme.colors.primary} strokeWidth={2} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.titleText, { color: theme.colors.text }]} numberOfLines={1}>
          {previewText}
        </Text>
        <Text style={[styles.subtitleText, { color: theme.colors.icon }]}>
          Tin nhắn của {senderName}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

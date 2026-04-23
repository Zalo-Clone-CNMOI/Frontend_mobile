import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { Pin, X } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

interface PinnedMessageItem {
  message: ChatMessage;
  pinnedBy: string;
  pinnedAt: number;
}

interface PinnedMessagesSectionProps {
  pinnedMessages: PinnedMessageItem[];
  onPressMessage: (message: ChatMessage) => void;
  onUnpinMessage?: (message: ChatMessage) => void;
}

export const PinnedMessagesSection: React.FC<PinnedMessagesSectionProps> = ({
  pinnedMessages,
  onPressMessage,
  onUnpinMessage,
}) => {
  const theme = useTheme();

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Pin size={14} color={theme.colors.primary} fill={theme.colors.primary} />
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            Tin nhắn đã ghim
          </Text>
        </View>
        <Text style={[styles.headerCount, { color: theme.colors.icon }]}>
          {pinnedMessages.length}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pinnedMessages.map((item, index) => {
          const message = item.message;
          const messageText = (message as any).body || message.text || '';
          const hasAttachments = message.attachments && message.attachments.length > 0;
          
          let previewText = messageText;
          if (!previewText) {
            if (hasAttachments) previewText = '📎 Tệp';
            else previewText = 'Tin nhắn';
          }
          
          const truncatedText = previewText.length > 25 ? previewText.substring(0, 25) + '...' : previewText;

          return (
            <TouchableOpacity
              key={(message as any).messageId || message.id || `pinned-${index}`}
              style={[styles.pinnedItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => onPressMessage(message)}
              activeOpacity={0.7}
            >
              <View style={styles.pinnedItemLeft}>
                <Pin size={12} color={theme.colors.primary} fill={theme.colors.primary} />
                <Text style={[styles.pinnedText, { color: theme.colors.text }]} numberOfLines={1}>
                  {truncatedText}
                </Text>
              </View>
              {onUnpinMessage && (
                <TouchableOpacity
                  style={styles.unpinButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onUnpinMessage(message);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={12} color={theme.colors.icon} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    minWidth: 140,
    maxWidth: 180,
  },
  pinnedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  unpinButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});

export default PinnedMessagesSection;

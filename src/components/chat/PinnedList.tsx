import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import type { PinnedMessageItem } from '@/src/types/mappers/DTOMappers';
import { Pin, ChevronUp } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { PinnedItem } from './PinnedItem';

interface PinnedListProps {
  pinnedMessages: PinnedMessageItem[];
  onPressMessage: (message: ChatMessage) => void;
  onCollapse: () => void;
  highlightedMessageId?: string | null;
  conversationId?: string;
}

export const PinnedList: React.FC<PinnedListProps> = ({
  pinnedMessages,
  onPressMessage,
  onCollapse,
  highlightedMessageId,
  conversationId,
}) => {
  const theme = useTheme();

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Pin size={18} color={theme.colors.primary} fill={theme.colors.primary} />
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            Danh sách ghim
          </Text>
          <Text style={[styles.headerCount, { color: theme.colors.icon }]}>
            {pinnedMessages.length}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.collapseButton, { backgroundColor: `${theme.colors.primary}15` }]}
          onPress={onCollapse}
          hitSlop={8}
        >
          <ChevronUp size={18} color={theme.colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {pinnedMessages.map((item, index) => {
          const messageId = item.message.id;
          const isHighlighted = messageId === highlightedMessageId;

          return (
            <PinnedItem
              key={messageId || `pinned-${index}`}
              item={item}
              onPress={(message) => {
                onPressMessage(message);
                onCollapse();
              }}
              isHighlighted={isHighlighted}
              conversationId={conversationId}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingVertical: 8,
  },
});

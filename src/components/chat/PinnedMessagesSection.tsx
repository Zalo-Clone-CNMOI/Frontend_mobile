import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import type { PinnedMessageItem } from '@/src/types/mappers/DTOMappers';
import React, { useState } from 'react';
import { View } from 'react-native';
import { PinnedPreviewBar } from './PinnedPreviewBar';
import { ReminderCard } from './ReminderCard';
import { PinnedList } from './PinnedList';

interface Reminder {
  id: string;
  title: string;
  date: number;
  description?: string;
}

interface PinnedMessagesSectionProps {
  pinnedMessages: PinnedMessageItem[];
  reminders?: Reminder[];
  onPressMessage: (message: ChatMessage) => void;
  onUnpinMessage?: (message: ChatMessage) => void;
  conversationId?: string;
}

export const PinnedMessagesSection: React.FC<PinnedMessagesSectionProps> = ({
  pinnedMessages,
  reminders = [],
  onPressMessage,
  onUnpinMessage,
  conversationId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setHighlightedMessageId(null);
  };

  const handlePressMessage = (message: ChatMessage) => {
    setHighlightedMessageId(message.id);
    onPressMessage(message);
  };

  if (isExpanded) {
    return (
      <View>
        <ReminderCard reminders={reminders} />
        <PinnedList
          pinnedMessages={pinnedMessages}
          onPressMessage={handlePressMessage}
          onCollapse={handleCollapse}
          highlightedMessageId={highlightedMessageId}
          conversationId={conversationId}
        />
      </View>
    );
  }

  return (
    <PinnedPreviewBar
      pinnedMessages={pinnedMessages}
      onPress={handleExpand}
      conversationId={conversationId}
    />
  );
};


export default PinnedMessagesSection;

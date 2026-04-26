import { Check, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatLastMessage } from '@/src/utils/messageFormatter';
import { styles } from './styles';

interface Conversation {
  conversationId: string;
  name?: string;
  avatar?: string | null;
  isGroup?: boolean;
  lastMessage?: {
    type?: string;
    content?: string;
    senderName?: string;
    fromMe?: boolean;
    attachments?: Array<{
      type?: string;
      content_type?: string;
    }>;
  };
}

interface ContactListProps {
  conversations: Conversation[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  loading?: boolean;
}

const AVATAR_FALLBACK_URL = 'https://ui-avatars.com/api/?background=random&color=7F9CFB';

const getAvatarSource = (chat: Conversation) => {
  if (chat.avatar) {
    return { uri: chat.avatar };
  }
  const name = chat.name || 'User';
  return { uri: `${AVATAR_FALLBACK_URL}&name=${encodeURIComponent(name)}` };
};

interface ContactItemProps {
  chat: Conversation;
  isSelected: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

const ContactItem: React.FC<ContactItemProps> = ({ chat, isSelected, onPress, t }) => (
  <TouchableOpacity
    key={chat.conversationId}
    style={styles.contactRow}
    onPress={onPress}
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

interface SectionProps {
  title: string;
  chats: Conversation[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  showViewMore?: boolean;
  t: ReturnType<typeof useTranslation>['t'];
}

const Section: React.FC<SectionProps> = ({
  title,
  chats,
  selectedIds,
  onToggleSelection,
  showViewMore,
  t,
}) => {
  if (chats.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {chats.map((chat) => (
        <ContactItem
          key={chat.conversationId}
          chat={chat}
          isSelected={selectedIds.has(chat.conversationId)}
          onPress={() => onToggleSelection(chat.conversationId)}
          t={t}
        />
      ))}
      {showViewMore && (
        <TouchableOpacity style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>{t('forward.viewMore')}</Text>
          <ChevronRight size={16} color="#8e8e93" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ContactList: React.FC<ContactListProps> = ({
  conversations,
  selectedIds,
  onToggleSelection,
  loading,
}) => {
  const { t } = useTranslation();

  // Separate conversations into recent and groups
  const recentChats = conversations.filter((chat) => !chat.isGroup);
  const groupChats = conversations.filter((chat) => chat.isGroup);

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('forward.loading')}</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('forward.noConversations')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <Section
        title={t('forward.recent')}
        chats={recentChats}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        showViewMore={recentChats.length > 5}
        t={t}
      />
      <Section
        title={t('forward.groups')}
        chats={groupChats}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        t={t}
      />
    </ScrollView>
  );
};

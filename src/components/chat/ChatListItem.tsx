import type { ConversationV2 } from '@/src/types/chat';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/themeContext';
import { useChatStore } from '../../store/chatStore';

export function ChatListItem({
  item,
  onPress,
}: {
  item: ConversationV2;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { presence } = useChatStore();
  const messageTime = item.lastMessage?.timestamp || item.lastMessageAt;

  // Get presence status for the other user (not for groups)
  const getPresenceStatus = () => {
    if (item.isGroup) return null;
    // Get the other user's ID (for direct conversations)
    const userId = item.otherUserId || item.userId;
    if (!userId) return null;
    const userPresence = presence[userId];
    if (!userPresence) return null;
    // Check if presence is still valid (not expired)
    if (Date.now() > userPresence.expires_at) return null;
    return userPresence.status;
  };

  const presenceStatus = getPresenceStatus();

  const getAvatarSource = () => {
    if (item.avatar) {
      return { uri: item.avatar };
    }
    return null;
  };

  const avatarSource = getAvatarSource();

  return (
    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: theme.colors.border }]} onPress={onPress}>
      <View>
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatar} />
        ) : (
          <AvatarWithInitials name={item.name || 'User'} size={55} style={styles.avatar} />
        )}
        {item.unreadCount && item.unreadCount > 0 ? <View style={[styles.redDot, { borderColor: theme.colors.background }]} /> : null}
        {presenceStatus === 'online' && <View style={[styles.onlineDot, { borderColor: theme.colors.background }]} />}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.chatTime, { color: '#8e8e93' }]}>
            {messageTime
              ? new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : ''}
          </Text>
        </View>
        <Text style={[styles.lastMsg, { color: '#8e8e93' }]} numberOfLines={1}>
          {item.lastMessage?.content || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 0.5 },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  redDot: {
    position: 'absolute',
    right: 0,
    top: 2,
    width: 12,
    height: 12,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 14,
    height: 14,
    backgroundColor: '#34c759',
    borderRadius: 7,
    borderWidth: 2.5,
  },
  chatContent: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 17, fontWeight: '500' },
  chatTime: { fontSize: 12 },
  lastMsg: { fontSize: 14.5 },
});

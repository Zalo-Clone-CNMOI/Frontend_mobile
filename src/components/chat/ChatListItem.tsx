import type { ConversationV2 } from '@/src/types/chat';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/themeContext';

export function ChatListItem({
  item,
  onPress,
}: {
  item: ConversationV2;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: theme.colors.border }]} onPress={onPress}>
      <View>
        <Image source={{ uri: item.avatar || '' }} style={styles.avatar} />
        {item.unreadCount && item.unreadCount > 0 ? <View style={[styles.redDot, { borderColor: theme.colors.background }]} /> : null}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.chatTime, { color: '#8e8e93' }]}>{item.lastMessage ? new Date(item.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</Text>
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
  chatContent: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 17, fontWeight: '500' },
  chatTime: { fontSize: 12 },
  lastMsg: { fontSize: 14.5 },
});

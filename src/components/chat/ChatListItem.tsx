import type { ConversationV2 } from '@/src/types/chat';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ChatListItem({
  item,
  onPress,
}: {
  item: ConversationV2;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View>
        <Image source={{ uri: item.avatar || '' }} style={styles.avatar} />
        {item.unreadCount && item.unreadCount > 0 ? <View style={styles.redDot} /> : null}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.lastMessage ? new Date(item.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.lastMessage?.content || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center' },
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
    borderColor: '#000',
  },
  chatContent: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 17, fontWeight: '500' },
  chatTime: { color: '#8e8e93', fontSize: 12 },
  lastMsg: { color: '#8e8e93', fontSize: 14.5 },
});

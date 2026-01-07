import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import type { ChatPreview } from '@/src/types/chat';

export function ChatListItem({
  item,
  onPress,
}: {
  item: ChatPreview;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.hasDot && <View style={styles.redDot} />}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time ?? ''}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.lastMsg}
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

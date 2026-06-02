import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, Video, PhoneMissed } from 'lucide-react-native';
import { useTheme } from '@/src/theme/themeContext';
import type {
  ChatMessage,
  CallEndedMetadata,
  CallMissedMetadata,
} from '@/src/types/chat';

interface SystemMessageBannerProps {
  message: ChatMessage;
}

export function SystemMessageBanner({ message }: SystemMessageBannerProps) {
  const theme = useTheme();
  const fallbackColor = theme.colors.icon || '#8E8E93';

  if (message.systemEventType === 'call_ended') {
    const meta = message.metadata as CallEndedMetadata | undefined;
    const isVideo = meta?.call_type === 'video';
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
          {isVideo ? (
            <Video size={14} color="#34C759" />
          ) : (
            <Phone size={14} color="#34C759" />
          )}
        </View>
        <Text style={[styles.text, { color: '#34C759' }]}>
          {message.text || 'Cuộc gọi đã kết thúc'}
        </Text>
      </View>
    );
  }

  if (message.systemEventType === 'call_missed') {
    const meta = message.metadata as CallMissedMetadata | undefined;
    const isVideo = meta?.call_type === 'video';
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
          {isVideo ? (
            <Video size={14} color="#FF3B30" />
          ) : (
            <PhoneMissed size={14} color="#FF3B30" />
          )}
        </View>
        <Text style={[styles.text, { color: '#FF3B30' }]}>
          {message.text || 'Cuộc gọi nhỡ'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: fallbackColor }]}>
        {message.text || 'Tin nhắn hệ thống'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    gap: 6,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

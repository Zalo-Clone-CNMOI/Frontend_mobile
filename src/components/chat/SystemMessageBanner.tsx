import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { ChatMessage } from '@/src/types/chat';

interface SystemMessageBannerProps {
  message: ChatMessage;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} phút ${seconds} giây`;
}

function getCallLabel(callType: unknown): string {
  return callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
}

function buildSystemMessageFallback(message: ChatMessage): string {
  const systemEventType = message.systemEventType;
  const meta = (message.metadata || {}) as Record<string, any>;

  if (systemEventType === 'call_ended') {
    const durationMs = Number(meta.duration_ms ?? meta.durationMs ?? 0);
    return `${getCallLabel(meta.call_type ?? meta.callType)} - ${formatDuration(durationMs)}`;
  }

  if (systemEventType === 'call_missed') {
    return `${getCallLabel(meta.call_type ?? meta.callType)} nhỡ`;
  }

  return 'Tin nhắn hệ thống';
}

export function SystemMessageBanner({ message }: SystemMessageBannerProps) {
  const theme = useTheme();

  const systemEventType = message.systemEventType;
  const renderedText =
    (message.text || message.content || '').trim() ||
    buildSystemMessageFallback(message);

  const isCallMissed = systemEventType === 'call_missed';
  const isCallEnded = systemEventType === 'call_ended';

  const textColor = isCallMissed
    ? '#ff3b30'
    : isCallEnded
      ? theme.colors.primary || '#34C759'
      : theme.colors.icon || '#8E8E93';

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: textColor }]}>
        {renderedText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
});

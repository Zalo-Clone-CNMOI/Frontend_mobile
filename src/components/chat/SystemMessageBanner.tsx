import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { ChatMessage } from '@/src/types/chat';

interface SystemMessageBannerProps {
  message: ChatMessage;
}

export function SystemMessageBanner({ message }: SystemMessageBannerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.colors.icon || '#8E8E93' }]}>
        {message.text || 'Tin nhắn hệ thống'}
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

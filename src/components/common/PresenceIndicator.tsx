/**
 * Presence Indicator - Online/Offline status dot
 * Giống Zalo: chấm xanh (online), xám (offline)
 */

import { useTheme } from '@/src/theme/themeContext';
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export type PresenceStatus = 'online' | 'offline';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'small' | 'medium' | 'large';
  showBorder?: boolean;
  lastSeenAt?: number; // timestamp
}

export function PresenceIndicator({
  status,
  size = 'medium',
  showBorder = true,
  lastSeenAt,
}: PresenceIndicatorProps) {
  const theme = useTheme();

  const sizeMap = {
    small: { dot: 8, border: 2 },
    medium: { dot: 12, border: 2 },
    large: { dot: 16, border: 3 },
  };

  const { dot, border } = sizeMap[size];

  const getStatusText = (): string => {
    if (status === 'online') return 'Đang hoạt động';
    if (!lastSeenAt) return 'Offline';

    const now = Date.now();
    const diff = now - lastSeenAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa mới truy cập';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return new Date(lastSeenAt).toLocaleDateString('vi-VN');
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: status === 'online' ? '#00C853' : '#D1D5DB',
            borderWidth: showBorder ? border : 0,
            borderColor: theme.colors.background,
          },
        ]}
      />
    </View>
  );
}

export function PresenceText({
  status,
  lastSeenAt,
}: {
  status: PresenceStatus;
  lastSeenAt?: number;
}) {
  const theme = useTheme();

  const getStatusText = (): string => {
    if (status === 'online') return 'Đang hoạt động';
    if (!lastSeenAt) return 'Offline';

    const now = Date.now();
    const diff = now - lastSeenAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa truy cập';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return new Date(lastSeenAt).toLocaleDateString('vi-VN');
  };

  return (
    <Text
      style={[
        styles.text,
        {
          color: status === 'online' 
            ? '#00C853' 
            : theme.colors.icon || '#8E8E93',
          opacity: status === 'online' ? 1 : 0.7,
        },
      ]}
    >
      {getStatusText()}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  text: {
    fontSize: 12,
    marginTop: 2,
  },
});

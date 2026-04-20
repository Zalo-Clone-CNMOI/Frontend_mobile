/**
 * Avatar with Presence Indicator (Online/Offline dot)
 * Giống Zalo: Avatar có chấm xanh/xám ở góc
 */

import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { PresenceIndicator, type PresenceStatus } from './PresenceIndicator';

interface AvatarWithPresenceProps {
  uri?: string | null;
  name?: string;
  size?: number;
  status?: PresenceStatus;
  lastSeenAt?: number;
  showPresence?: boolean;
}

export function AvatarWithPresence({
  uri,
  name,
  size = 48,
  status = 'offline',
  lastSeenAt,
  showPresence = true,
}: AvatarWithPresenceProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#E0E0E0',
            },
          ]}
        >
          <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {showPresence && (
        <View
          style={[
            styles.indicatorContainer,
            {
              bottom: size * 0.05,
              right: size * 0.05,
            },
          ]}
        >
          <PresenceIndicator
            status={status}
            size={size > 40 ? 'medium' : 'small'}
            lastSeenAt={lastSeenAt}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#757575',
    fontWeight: '600',
  },
  indicatorContainer: {
    position: 'absolute',
    zIndex: 1,
  },
});

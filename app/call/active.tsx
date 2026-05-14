import { ActiveCallScreen } from '@/src/screens/call';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ActiveCallRoute() {
  const { participantName, participantAvatar } = useLocalSearchParams<{
    participantName?: string;
    participantAvatar?: string;
  }>();

  return (
    <ActiveCallScreen
      participantName={participantName || 'User'}
      participantAvatar={participantAvatar || undefined}
    />
  );
}

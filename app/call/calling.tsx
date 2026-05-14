import { CallingScreen } from '@/src/screens/call';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function CallingRoute() {
  const { recipientName, recipientAvatar } = useLocalSearchParams<{
    recipientName?: string;
    recipientAvatar?: string;
  }>();

  return (
    <CallingScreen
      recipientName={recipientName || 'User'}
      recipientAvatar={recipientAvatar || undefined}
    />
  );
}

import { ActiveCallScreen } from '@/src/screens/call';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ActiveCallRoute() {
  const { callType } = useLocalSearchParams<{
    callType?: 'audio' | 'video';
  }>();

  return (
    <ActiveCallScreen callType={callType || 'audio'} />
  );
}

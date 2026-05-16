import { CallingScreen } from '@/src/screens/call';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function CallingRoute() {
  const params = useLocalSearchParams<{
    recipientName?: string;
    recipientAvatar?: string;
    callType?: 'audio' | 'video';
  }>();

  return (
    <CallingScreen callType={params.callType || 'audio'} />
  );
}

import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { registerForPushNotifications } from './registerForPushNotifications';
import { registerAndSyncToken, getPendingToken } from '../services/deviceTokenService';
import { getExpoNotifications } from './expoNotifications';

async function playRingtone() {
  try {
    const { playRingtone } = require('../services/callRingtone');
    playRingtone();
  } catch {}
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    const Notifications = getExpoNotifications();
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }
    if (registeredRef.current) return;

    (async () => {
      try {
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
          return;
        }

        const token = await registerForPushNotifications();
        if (!token) return;

        const pendingToken = await getPendingToken();
        const tokenToSend = pendingToken || token;

        await registerAndSyncToken(tokenToSend);
        registeredRef.current = true;
      } catch (e) {
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    const Notifications = getExpoNotifications();
    if (!Notifications) return;

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any> | undefined;
      if (!data) return;

      if (data.type === 'incoming_call' || data.action === 'incoming_call') {
        const { useCallStore } = require('../store/useCallStore');
        const { callState } = useCallStore.getState();
        if (callState !== 'idle' && callState !== 'ended') return;

        useCallStore.getState().addIncomingCall({
          callId: data.callId || data.call_id || '',
          initiatorId: data.initiatorId || data.initiator_id || '',
          initiatorName: data.senderName || data.callerName || 'Đang tải...',
          conversationId: data.conversationId || data.conversation_id || '',
          conversationType: data.conversationType || data.conversation_type || 'direct',
          callType: data.callType || data.call_type || 'audio',
          startedAt: Date.now(),
        });
        useCallStore.getState().setCallState('incoming');
        playRingtone();
        router.push('/call/incoming' as any);
      } else if (data.type === 'missed_call' || data.action === 'missed_call') {
        const conversationId = data.conversationId || data.conversation_id;
        if (conversationId) {
          try {
            const { useConversationStore } = require('../store/useConversationStore');
            useConversationStore.getState().incrementUnread(conversationId, 1);
          } catch {}
        }
      }
    });

    return () => {
      sub1.remove();
    };
  }, []);
}

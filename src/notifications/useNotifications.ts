import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { registerForPushNotifications } from './registerForPushNotifications';
import { registerAndSyncToken, getPendingToken } from '../services/deviceTokenService';
import { getExpoNotifications } from './expoNotifications';
import { router } from 'expo-router';
import { playRingtone, stopRingtone } from '../services/callRingtone';

import { useChatsStore } from '../store/useChatsStore';

const normalizeConversationType = (value: unknown): 'direct' | 'group' =>
  value === 'group' ? 'group' : 'direct';

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
        // deviceTokenService handles pending token storage internally
      }
    })();
  }, [isAuthenticated]);

  const handleIncomingCallAction = async (data: Record<string, any>) => {
    try {
      const callId = data.call_id || data.callId;
      const conversationId = data.conversation_id || data.conversationId;
      const callType = data.call_type || data.callType;

      if (!conversationId) return;

      // Ensure we don't leave a previous ringtone playing
      try { stopRingtone(); } catch {}
      try {
        playRingtone();
      } catch {}

      router.push({
        pathname: '/call/incoming',
        params: {
          callId,
          conversationId,
          conversationType: normalizeConversationType(data.conversation_type || data.conversationType),
          callType: callType || 'audio',
          initiatorId: data.initiator_id || data.initiatorId,
        },
      } as any);
    } catch {
      // ignore
    }
  };

  const handleMissedCallAction = async (data: Record<string, any>) => {
    try {
      const conversationId = data.conversation_id || data.conversationId;
      if (!conversationId) return;

      // Badge/unread indicator (summary call)
      useChatsStore.getState().incrementUnreadCount(conversationId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const Notifications = getExpoNotifications();
    if (!Notifications) return;

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const { data } = notification.request.content as any;
      const action = data?.action;

      if (action === 'incoming_call') {
        void handleIncomingCallAction(data);
      } else if (action === 'missed_call') {
        void handleMissedCallAction(data);
      }
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content as any;
      const action = data?.action;

      if (action === 'incoming_call') {
        void handleIncomingCallAction(data);
      } else if (action === 'missed_call') {
        void handleMissedCallAction(data);
        const conversationId = data?.conversation_id || data?.conversationId;
        if (conversationId) {
          router.push(`/chat/${conversationId}` as any);
        }
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);
}



import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useInAppNotification } from '../notifications/useInAppNotification';
import { createSocket, getSocket } from '../services/socket';
import { WsEvents } from '../realtime/events';
import { useRoute } from '@react-navigation/native';
import { subscribeToPollEvents, setPollEventCallbacks, setPollCurrentUserId } from '../services/pollEventsHandler';
import { usePollStore } from '../store/usePollStore';
import { useRealtimeStore } from '../store/useRealtimeStore';
import { appStateService } from '../services/appStateService';
import { localNotificationService } from '../services/localNotificationService';

// Global ref to track current conversation across the app
const currentConversationIdRef = { current: null as string | null };

/**
 * Set current conversation ID from ChatDetail screen
 * Use this to suppress notifications for the current conversation
 */
export function setCurrentConversationId(conversationId: string | null) {
  currentConversationIdRef.current = conversationId;
  console.log('[NotificationListener] Current conversation set to:', conversationId);
}

export function useNotificationListener() {
  const { user: authUser } = useAuth();
  const { showInfo } = useInAppNotification();
  const router = useRouter();
  const route = useRoute() as any;
  const currentConversationId = useRef<string | null>(null);
  const userId = (authUser as any)?.id;
  const friends = useRealtimeStore((state) => state.friends);

  // Helper: Get sender name from friends store or fallback
  const getSenderName = useCallback((senderId: string, payloadSenderName?: string): string => {
    // 1. Try from payload first (if backend sends it)
    if (payloadSenderName && payloadSenderName !== 'Người dùng') {
      return payloadSenderName;
    }
    // 2. Try from friends store
    const friend = friends.find((f) => f.id === senderId);
    if (friend?.fullName) {
      return friend.fullName;
    }
    // 3. Fallback
    return 'Người dùng';
  }, [friends]);

  // Set current user ID for poll events
  useEffect(() => {
    if (userId) {
      setPollCurrentUserId(userId);
    }
  }, [userId]);

  // Track current conversation ID
  useEffect(() => {
    if (route?.params?.id) {
      currentConversationId.current = route.params.id as string;
    } else {
      currentConversationId.current = null;
    }
  }, [route?.params?.id]);

  // Main notification listener effect
  useEffect(() => {
    let socket: any = null;
    let isActive = true;
    const handlers: { [key: string]: any } = {};

    const setupListeners = async () => {
      try {
        socket = getSocket() || (await createSocket());
        if (!isActive) return;

        console.log('[NotificationListener] Socket obtained:', socket?.id, 'connected:', socket?.connected, 'userId:', userId);

        if (!socket || !userId) {
          console.log('[NotificationListener] Skipping setup - socket or userId missing');
          return;
        }

        // Listen for new messages
        handlers.handleMessage = async (payload: any) => {
          console.log('[NotificationListener] ChatMessage received:', payload);
          const conversationId = payload?.conversation_id || payload?.conversationId;
          const senderId = payload?.sender_id || payload?.senderId;
          const payloadSenderName = payload?.sender_name || payload?.senderName;
          const body = payload?.body || payload?.content || '';
          const messageId = payload?.message_id || payload?.id;

          // Get sender name from friends store or payload
          const senderName = getSenderName(senderId, payloadSenderName);

          console.log('[NotificationListener] Parsed:', { conversationId, senderId, senderName, body, messageId, currentUserId: userId });

          // Don't show notification if message is from me
          if (senderId === userId) {
            console.log('[NotificationListener] Message from self, skipping');
            return;
          }

          // Don't show if I'm currently in this conversation and app is active
          const isInConversation = conversationId === currentConversationId.current ||
                                   conversationId === currentConversationIdRef.current;
          console.log('[NotificationListener] isInConversation:', isInConversation, 'appActive:', appStateService.isActive());

          if (isInConversation && appStateService.isActive()) {
            console.log('[NotificationListener] In conversation and app active, skipping notification');
            return;
          }

          // Background: Show local push notification
          if (appStateService.isBackground()) {
            console.log('[NotificationListener] App in background, showing local notification');
            if (conversationId && messageId) {
              await localNotificationService.showMessageNotification(
                senderName,
                body,
                conversationId,
                messageId,
                senderId || ''
              );
            }
            return;
          }

          // Foreground: Show in-app notification
          console.log('[NotificationListener] Showing in-app notification:', senderName, body);
          showInfo(
            senderName,
            body || 'Đã gửi một tin nhắn',
            {
              onPress: () => {
                router.push(`/chat/${conversationId}` as any);
              },
            }
          );
        };

        // Listen for group invites
        handlers.handleGroupInvite = async (payload: any) => {
          const inviterName = payload?.inviter_full_name || payload?.inviterName || 'Người dùng';
          const conversationName = payload?.conversation_name || payload?.conversationName || 'nhóm';
          const conversationId = payload?.conversation_id || payload?.conversationId;

          if (appStateService.isBackground()) {
            if (conversationId) {
              await localNotificationService.showGroupInviteNotification(
                inviterName,
                conversationName,
                conversationId
              );
            }
            return;
          }

          showInfo(
            'Lời mời tham gia nhóm',
            `${inviterName} đã mời bạn vào nhóm ${conversationName}`,
            {
              onPress: () => {
                router.push('/(tabs)' as any);
              },
            }
          );
        };

        // Listen for member added to group
        handlers.handleMemberAdded = (payload: any) => {
          const members = payload?.members || [];
          const wasIAmAdded = members.some((m: any) => m.user_id === userId);
          if (wasIAmAdded) {
            const conversationName = payload?.conversation_name || 'nhóm';
            showInfo(
              'Đã thêm vào nhóm',
              `Bạn đã được thêm vào nhóm ${conversationName}`,
              {
                onPress: () => {
                  router.push(`/chat/${payload.conversation_id}` as any);
                },
              }
            );
          }
        };

        // Register listeners
        console.log('[NotificationListener] Registering listeners for:', WsEvents.ChatMessage, WsEvents.GroupInviteSent);
        socket.on(WsEvents.ChatMessage, handlers.handleMessage);
        socket.on(WsEvents.GroupInviteSent, handlers.handleGroupInvite);
        socket.on(WsEvents.ConversationMemberAdded, handlers.handleMemberAdded);
        console.log('[NotificationListener] Listeners registered');

        // Poll events
        setPollEventCallbacks({
          onPollCreated: (payload) => {
            usePollStore.getState().handlePollCreated(payload);
            if (payload.creator_id === userId) return;
            if (payload.conversation_id === currentConversationId.current) return;
            showInfo('Bình chọn mới', payload.question, {
              onPress: () => router.push(`/chat/${payload.conversation_id}` as any),
            });
          },
          onPollEdited: (payload) => usePollStore.getState().handlePollEdited(payload),
          onPollVoteUpdated: (payload) => usePollStore.getState().handlePollVoteUpdated(payload),
          onPollOptionAdded: (payload) => usePollStore.getState().handlePollOptionAdded(payload),
          onPollOptionRemoved: (payload) => usePollStore.getState().handlePollOptionRemoved(payload),
          onPollClosed: (payload) => {
            usePollStore.getState().handlePollClosed(payload);
            if (payload.conversation_id === currentConversationId.current) return;
            showInfo('Bình chọn đã kết thúc', 'Bình chọn đã đóng', {
              onPress: () => router.push(`/chat/${payload.conversation_id}` as any),
            });
          },
        });
        subscribeToPollEvents();

      } catch (error) {
        console.error('[NotificationListener] Setup error:', error);
      }
    };

    setupListeners();

    // Cleanup
    return () => {
      isActive = false;
      if (socket && handlers.handleMessage) {
        socket.off(WsEvents.ChatMessage, handlers.handleMessage);
        socket.off(WsEvents.GroupInviteSent, handlers.handleGroupInvite);
        socket.off(WsEvents.ConversationMemberAdded, handlers.handleMemberAdded);
        console.log('[NotificationListener] Listeners removed');
      }
    };
  }, [userId, showInfo, router, getSenderName]);
}

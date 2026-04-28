import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useInAppNotification } from '../notifications/useInAppNotification';
import { getSocket } from '../services/socket';
import { WsEvents } from '../realtime/events';
import { useRoute } from '@react-navigation/native';
import { subscribeToPollEvents, setPollEventCallbacks, setPollCurrentUserId } from '../services/pollEventsHandler';
import { usePollStore } from '../store/usePollStore';

export function useNotificationListener() {
  const { user: authUser } = useAuth();
  const { showInfo } = useInAppNotification();
  const router = useRouter();
  const route = useRoute() as any;
  const currentConversationId = useRef<string | null>(null);
  const userId = (authUser as any)?.id;

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

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userId) return;

    // Listen for new messages
    const handleMessage = (payload: any) => {
      const conversationId = payload?.conversation_id || payload?.conversationId;
      const senderId = payload?.sender_id || payload?.senderId;
      const senderName = payload?.sender_name || payload?.senderName || 'Người dùng';
      const body = payload?.body || payload?.content || '';

      // Don't show notification if:
      // - Message is from me
      // - I'm currently in this conversation
      if (senderId === userId) return;
      if (conversationId === currentConversationId.current) return;

      // Show notification
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
    const handleGroupInvite = (payload: any) => {
      const inviterName = payload?.inviter_full_name || payload?.inviterName || 'Người dùng';
      const conversationName = payload?.conversation_name || payload?.conversationName || 'nhóm';

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
    const handleMemberAdded = (payload: any) => {
      const addedBy = payload?.added_by;
      const members = payload?.members || [];

      // Check if I was added
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
    socket.on(WsEvents.ChatMessage, handleMessage);
    socket.on(WsEvents.GroupInviteSent, handleGroupInvite);
    socket.on(WsEvents.ConversationMemberAdded, handleMemberAdded);

    // Register poll event callbacks for notifications and store updates
    setPollEventCallbacks({
      onPollCreated: (payload) => {
        const conversationId = payload.conversation_id;
        const question = payload.question;

        // Update poll store
        usePollStore.getState().handlePollCreated(payload);

        // Don't show notification if I'm the creator or in the conversation
        if (payload.creator_id === userId) return;
        if (conversationId === currentConversationId.current) return;

        showInfo(
          'Bình chọn mới',
          question,
          {
            onPress: () => {
              router.push(`/chat/${conversationId}` as any);
            },
          }
        );
      },
      onPollEdited: (payload) => {
        // Update poll store
        usePollStore.getState().handlePollEdited(payload);
      },
      onPollVoteUpdated: (payload) => {
        // Update poll store
        usePollStore.getState().handlePollVoteUpdated(payload);
      },
      onPollOptionAdded: (payload) => {
        // Update poll store
        usePollStore.getState().handlePollOptionAdded(payload);
      },
      onPollOptionRemoved: (payload) => {
        // Update poll store
        usePollStore.getState().handlePollOptionRemoved(payload);
      },
      onPollClosed: (payload) => {
        const conversationId = payload.conversation_id;

        // Update poll store
        usePollStore.getState().handlePollClosed(payload);

        // Don't show notification if I'm in the conversation
        if (conversationId === currentConversationId.current) return;

        showInfo(
          'Bình chọn đã kết thúc',
          'Bình chọn đã đóng',
          {
            onPress: () => {
              router.push(`/chat/${conversationId}` as any);
            },
          }
        );
      },
    });

    // Subscribe to poll events
    subscribeToPollEvents();

    return () => {
      socket.off(WsEvents.ChatMessage, handleMessage);
      socket.off(WsEvents.GroupInviteSent, handleGroupInvite);
      socket.off(WsEvents.ConversationMemberAdded, handleMemberAdded);
    };
  }, [userId, showInfo, router]);
}

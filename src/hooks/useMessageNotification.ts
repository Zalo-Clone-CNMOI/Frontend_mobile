import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '../contexts/AuthContext';

import { getSocket } from '../services/socket';
import { appStateService } from '../services/appStateService';
import { localNotificationService } from '../services/localNotificationService';

import { useInAppNotification } from '../notifications/useInAppNotification';

import { useMessagesStore } from '../store/useMessagesStore';
import { useChatStore } from '../store/chatStore';

import {
  isMessageProcessed,
  addProcessedMessageId,
} from '../services/chatService';

import { WsEvents } from '../realtime/events';

interface MessagePayload {
  message_id?: string;
  conversation_id?: string;
  sender_id?: string;
  sender_name?: string;
  body?: string;
  content?: string;
  created_at?: number;
  createdAt?: number;
  attachments?: any[];
  fileKey?: string;
  attachment_key?: string;
  id?: string;
  conversationId?: string;
  senderId?: string;
}

export function useMessageNotification() {
  const { user } = useAuth();

  const router = useRouter();

  const { showInfo } = useInAppNotification();

  const currentUserId = user?.id;

  const currentConversationIdRef =
    useRef<string | null>(null);

  /**
   * Set current opened conversation
   * Call from ChatDetail screen
   */
  const setCurrentConversation = useCallback(
    (conversationId: string | null) => {
      currentConversationIdRef.current =
        conversationId;
    },
    []
  );

  /**
   * Handle new incoming message
   */
  const handleNewMessage = useCallback(
    async (payload: MessagePayload) => {
      try {
        const messageId =
          payload.message_id || payload.id;

        const conversationId =
          payload.conversation_id ||
          payload.conversationId;

        const senderId =
          payload.sender_id ||
          payload.senderId;

        const senderName =
          payload.sender_name || (payload.sender_id === '00000000-0000-4000-8000-0000000000a1' ? 'Zai' : 'Người dùng');

        const body =
          payload.body || payload.content || '';

        console.log(
          '[MessageNotification] New message:',
          {
            messageId,
            conversationId,
            senderId,
            senderName,
          }
        );

        /**
         * Ignore own message
         */
        if (senderId === currentUserId) {
          return;
        }

        /**
         * Deduplication
         */
        const messageKey = String(
          messageId || ''
        );

        if (
          messageKey &&
          isMessageProcessed(messageKey)
        ) {
          console.log(
            '[MessageNotification] Message already processed'
          );

          return;
        }

        if (messageKey) {
          addProcessedMessageId(messageKey);
        }

        /**
         * App state
         */
        const isBackground =
          appStateService.isBackground();

        const isInConversation =
          conversationId ===
          currentConversationIdRef.current;

        console.log(
          '[MessageNotification] State:',
          {
            isBackground,
            isInConversation,
            currentConversation:
              currentConversationIdRef.current,
          }
        );

        /**
         * User already viewing this conversation
         * No notification needed
         */
        if (
          !isBackground &&
          isInConversation
        ) {
          return;
        }

        /**
         * Foreground in-app notification
         */
        if (!isBackground) {
          showInfo(
            senderName,
            body || 'Đã gửi một tin nhắn',
            {
              onPress: () => {
                if (conversationId) {
                  router.push(
                    `/chat/${conversationId}` as any
                  );
                }
              },
            }
          );

          return;
        }

        /**
         * Background local notification
         */
        if (
          isBackground &&
          conversationId &&
          messageId
        ) {
          await localNotificationService.showMessageNotification(
            senderName,
            body || 'Đã gửi một tin nhắn',
            conversationId,
            messageId,
            senderId || ''
          );
        }
      } catch (error) {
        console.error(
          '[MessageNotification] handleNewMessage error:',
          error
        );
      }
    },
    [currentUserId, router, showInfo]
  );

  /**
   * Message updated
   */
  const handleMessageUpdated = useCallback(
    (payload: any) => {
      console.log(
        '[MessageNotification] Message updated:',
        payload
      );

      useChatStore
        .getState()
        .updateMessage(payload);
    },
    []
  );

  /**
   * Message deleted
   */
  const handleMessageDeleted = useCallback(
    (payload: any) => {
      console.log(
        '[MessageNotification] Message deleted:',
        payload
      );

      useChatStore
        .getState()
        .deleteMessage(payload);
    },
    []
  );

  /**
   * Reaction added
   */
  const handleReactionAdded = useCallback(
    (payload: any) => {
      console.log(
        '[MessageNotification] Reaction added:',
        payload
      );

      useMessagesStore
        .getState()
        .addReaction?.(
          payload.conversation_id,
          payload.message_id,
          payload.user_id,
          payload.reaction_type
        );
    },
    []
  );

  /**
   * Reaction removed
   */
  const handleReactionRemoved = useCallback(
    (payload: any) => {
      console.log(
        '[MessageNotification] Reaction removed:',
        payload
      );

      useMessagesStore
        .getState()
        .removeReaction?.(
          payload.conversation_id,
          payload.message_id,
          payload.user_id
        );
    },
    []
  );

  /**
   * Setup socket listeners
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const socket = getSocket();

    if (!socket) {
      return;
    }

    console.log(
      '[MessageNotification] Setting up listeners'
    );

    socket.on(
      WsEvents.ChatMessage,
      handleNewMessage
    );

    socket.on(
      WsEvents.ChatMessageUpdated,
      handleMessageUpdated
    );

    socket.on(
      WsEvents.ChatMessageDeleted,
      handleMessageDeleted
    );

    socket.on(
      WsEvents.ChatReactionAdded,
      handleReactionAdded
    );

    socket.on(
      WsEvents.ChatReactionRemoved,
      handleReactionRemoved
    );

    return () => {
      console.log(
        '[MessageNotification] Cleaning listeners'
      );

      socket.off(
        WsEvents.ChatMessage,
        handleNewMessage
      );

      socket.off(
        WsEvents.ChatMessageUpdated,
        handleMessageUpdated
      );

      socket.off(
        WsEvents.ChatMessageDeleted,
        handleMessageDeleted
      );

      socket.off(
        WsEvents.ChatReactionAdded,
        handleReactionAdded
      );

      socket.off(
        WsEvents.ChatReactionRemoved,
        handleReactionRemoved
      );
    };
  }, [
    currentUserId,
    handleNewMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleReactionAdded,
    handleReactionRemoved,
  ]);

  return {
    setCurrentConversation,
  };
}
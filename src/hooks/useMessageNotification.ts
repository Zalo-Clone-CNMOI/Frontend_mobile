import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import { appStateService } from '../services/appStateService';
import { localNotificationService } from '../services/localNotificationService';
import { useInAppNotification } from '../notifications/useInAppNotification';
import { useChatsStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { useChatStore } from '../store/chatStore';
import { toLegacyChatMessage, enrichReplyToDetails, isMessageProcessed, addProcessedMessageId } from '../services/chatService';
import * as messagesApi from '../services/messagesApi';
import { detectPreviewTypeFromMessage, formatPreviewContent } from '../utils/messagePreviewFormatter';
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
  ts?: number;
  timestamp?: number;
  attachments?: any[];
  fileKey?: string;
  attachment_key?: string;
  id?: string;
  conversationId?: string;
  senderId?: string;
}

/**
 * Hook quản lý notification tin nhắn
 * - Foreground: Hiển thị in-app notification
 * - Background: Hiển thị local push notification
 * - Update UI realtime qua stores
 */
export function useMessageNotification() {
  const { user } = useAuth();
  const router = useRouter();
  const { showInfo } = useInAppNotification();

  const currentUserId = user?.id;
  const currentConversationIdRef = useRef<string | null>(null);

  // Set current conversation (gọi từ ChatDetail screen)
  const setCurrentConversation = useCallback((conversationId: string | null) => {
    currentConversationIdRef.current = conversationId;
  }, []);

  // Sync conversation với tin nhắn mới
  const syncConversationWithNewMessage = useCallback((payload: MessagePayload, enrichedMessage: any) => {
    const conversationId = payload.conversation_id || payload.conversationId;
    const createdAt = typeof payload.created_at === 'number' ? payload.created_at :
                      typeof payload.createdAt === 'number' ? payload.createdAt :
                      typeof payload.ts === 'number' ? payload.ts :
                      typeof enrichedMessage?.timestamp === 'number' ? enrichedMessage.timestamp : Date.now();

    if (!conversationId) return;

    const previewContent = formatPreviewContent(enrichedMessage);
    const previewType = detectPreviewTypeFromMessage(enrichedMessage);

    // Cập nhật conversation list
    useChatsStore.getState().updateLastMessage(
      conversationId,
      previewContent,
      previewType,
      createdAt,
      payload.sender_id || payload.senderId || enrichedMessage?.senderId,
      payload.sender_name || enrichedMessage?.senderName || 'Người dùng',
      true // Tăng unread count
    );

    // Thêm vào message store
    useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
  }, []);

  // Xử lý tin nhắn mới
  const handleNewMessage = useCallback(async (payload: MessagePayload) => {
    const messageId = payload.message_id || payload.id;
    const conversationId = payload.conversation_id || payload.conversationId;
    const senderId = payload.sender_id || payload.senderId;
    const senderName = payload.sender_name || 'Người dùng';
    const body = payload.body || payload.content || '';

    console.log('[MessageNotification] New message:', { messageId, conversationId, senderId, senderName });

    // Bỏ qua nếu là tin nhắn của mình
    if (senderId === currentUserId) return;

    // Bỏ qua nếu đã xử lý (deduplication)
    const messageKey = String(messageId || '');
    if (messageKey && isMessageProcessed(messageKey)) {
      console.log('[MessageNotification] Message already processed, skipping');
      return;
    }
    if (messageKey) {
      addProcessedMessageId(messageKey);
    }

    // Fetch full message details nếu cần
    const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;
    const requiresDetails = Boolean(
      conversationId && messageId && (payload.created_at || payload.createdAt) &&
      (hasAttachments || payload.attachment_key || payload.fileKey)
    );

    let enrichedMessage: any;
    try {
      if (requiresDetails) {
        const createdAt = payload.created_at || payload.createdAt || Date.now();
        const detailsResp = await messagesApi.getMessageDetails(conversationId!, createdAt, messageId!);
        const fullMessage = detailsResp?.data || payload;
        enrichedMessage = toLegacyChatMessage(fullMessage);
      } else {
        enrichedMessage = toLegacyChatMessage(payload);
      }
      enrichedMessage = await enrichReplyToDetails(enrichedMessage);
    } catch (e) {
      console.error('[MessageNotification] Error fetching message details:', e);
      enrichedMessage = toLegacyChatMessage(payload);
    }

    // Update stores
    syncConversationWithNewMessage(payload, enrichedMessage);

    // Kiểm tra app state
    const isBackground = appStateService.isBackground();
    const isInConversation = conversationId === currentConversationIdRef.current;

    console.log('[MessageNotification] App state:', { isBackground, isInConversation, currentConv: currentConversationIdRef.current });

    // Nếu đang ở trong conversation đó → không cần notification
    if (!isBackground && isInConversation) {
      console.log('[MessageNotification] In conversation, no notification needed');
      return;
    }

    // Foreground → In-app notification
    if (!isBackground) {
      showInfo(
        senderName,
        body || 'Đã gửi một tin nhắn',
        {
          onPress: () => {
            router.push(`/chat/${conversationId}` as any);
          },
        }
      );
      return;
    }

    // Background → Local push notification
    if (isBackground && conversationId && messageId) {
      await localNotificationService.showMessageNotification(
        senderName,
        body,
        conversationId,
        messageId,
        senderId || ''
      );
    }
  }, [currentUserId, router, showInfo, syncConversationWithNewMessage]);

  // Xử lý tin nhắn đã sửa
  const handleMessageUpdated = useCallback((payload: any) => {
    console.log('[MessageNotification] Message updated:', payload);
    useChatStore.getState().updateMessage(payload);
  }, []);

  // Xử lý tin nhắn đã xóa
  const handleMessageDeleted = useCallback((payload: any) => {
    console.log('[MessageNotification] Message deleted:', payload);
    useChatStore.getState().deleteMessage(payload);
  }, []);

  // Xử lý reaction
  const handleReactionAdded = useCallback((payload: any) => {
    console.log('[MessageNotification] Reaction added:', payload);
    useMessagesStore.getState().addReaction?.(
      payload.conversation_id,
      payload.message_id,
      payload.user_id,
      payload.reaction_type
    );
  }, []);

  const handleReactionRemoved = useCallback((payload: any) => {
    console.log('[MessageNotification] Reaction removed:', payload);
    useMessagesStore.getState().removeReaction?.(
      payload.conversation_id,
      payload.message_id,
      payload.user_id
    );
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUserId) return;

    console.log('[MessageNotification] Setting up listeners');

    socket.on(WsEvents.ChatMessage, handleNewMessage);
    socket.on(WsEvents.ChatMessageUpdated, handleMessageUpdated);
    socket.on(WsEvents.ChatMessageDeleted, handleMessageDeleted);
    socket.on(WsEvents.ChatReactionAdded, handleReactionAdded);
    socket.on(WsEvents.ChatReactionRemoved, handleReactionRemoved);

    return () => {
      console.log('[MessageNotification] Cleaning up listeners');
      socket.off(WsEvents.ChatMessage, handleNewMessage);
      socket.off(WsEvents.ChatMessageUpdated, handleMessageUpdated);
      socket.off(WsEvents.ChatMessageDeleted, handleMessageDeleted);
      socket.off(WsEvents.ChatReactionAdded, handleReactionAdded);
      socket.off(WsEvents.ChatReactionRemoved, handleReactionRemoved);
    };
  }, [currentUserId, handleNewMessage, handleMessageUpdated, handleMessageDeleted, handleReactionAdded, handleReactionRemoved]);

  return {
    setCurrentConversation,
  };
}

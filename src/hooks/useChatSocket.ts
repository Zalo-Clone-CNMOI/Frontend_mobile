import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSocket, disconnectSocket, getSocket } from '../services/socket';
import { deleteMessage, editMessage, sendMessage, unreactMessage, toLegacyChatMessage, enrichReplyToDetails, isMessageProcessed, addProcessedMessageId } from '../services/chatService';
import * as messagesApi from '../services/messagesApi';
import { useChatStore } from '../store/chatStore';
import { useChatsStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { detectPreviewTypeFromMessage, formatPreviewContent } from '../utils/messagePreviewFormatter';
import type {
  SocketChatDeletePayload,
  SocketChatEditPayload,
  SocketChatReactPayload,
  SocketChatSendPayload,
} from '../types/dto/SocketDTO';

/**
 * useChatSocket - DEPRECATED
 * This hook is now replaced by initChat() function pattern from Frontend_web
 * to avoid duplicate socket listener registration.
 * Socket listeners are now registered via ChatSocketBridge component calling initChat().
 *
 * This hook is kept for backward compatibility but should not be used in new code.
 */
export const useChatSocket = () => {
  console.warn('[useChatSocket] This hook is deprecated. Use initChat() instead via ChatSocketBridge component.');

  const { user } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const token = user?.tokens?.accessToken;
    const userId = user?.id;

    if (!token || !userId) return;

    // Connect socket
    createSocket().then((socket) => {
      // Setup event listeners and get cleanup function
      const cleanup = setupEventListeners(socket);

      // Store cleanup function for useEffect cleanup
      cleanupRef.current = cleanup;
    }).then((cleanup) => {
      // Store cleanup function for useEffect cleanup
      return cleanup;
    });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      disconnectSocket();
    };
  }, [user?.tokens?.accessToken, user?.id]);

  // ✅ FIX 1: Hàm đồng bộ conversation khi có tin nhắn mới
  const syncConversationWithNewMessage = (payload: any, enrichedMessage: any) => {
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const createdAt = typeof payload?.created_at === 'number' ? payload?.created_at :
                      typeof payload?.createdAt === 'number' ? payload?.createdAt :
                      typeof payload?.ts === 'number' ? payload?.ts :
                      typeof enrichedMessage?.timestamp === 'number' ? enrichedMessage?.timestamp : Date.now();
    
    if (!conversationId) return;
    
    // Format preview content based on message type
    const previewContent = formatPreviewContent(enrichedMessage);
    const previewType = detectPreviewTypeFromMessage(enrichedMessage);
    
    // ✅ Cập nhật useChatsStore để Home screen re-render
    useChatsStore.getState().updateLastMessage(
      conversationId,
      previewContent,
      previewType,
      createdAt,
      payload?.sender_id || payload?.senderId || enrichedMessage?.senderId,
      payload?.sender_name || payload?.senderName || enrichedMessage?.senderName,
      true // ✅ Tăng unread count
    );
    
    // ✅ Cũng thêm vào useMessagesStore cho chat detail view
    useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
  };

  const setupEventListeners = (socket: any) => {
    // Define handler functions so they can be removed later
    const handleConnect = () => {
      console.log('[Socket] Connected', socket.id);
    };

    const handleDisconnect = (reason: string) => {
      console.log('[Socket] Disconnected', reason);
    };

    const handleConnectError = (error: any) => {
      console.error('[Socket] Connect error', error);
    };

    const handleJoinAck = (payload: any) => {
      console.log('[Socket] Join ACK', payload);
    };

    // Chat read - Sync unread count when other users read messages
    const handleChatRead = (payload: any) => {
      console.log('[Socket] Chat read', payload);
      const conversationId = payload.conversation_id || payload.conversationId;
      const readerId = payload.user_id || payload.userId;

      // Only reset unread if someone else (not me) reads the conversation
      if (conversationId && readerId && readerId !== user?.id) {
        useChatStore.getState().resetUnreadCount(conversationId);
      }
    };

    // Message updated
    const handleMessageUpdated = (payload: any) => {
      console.log('[Socket] Message updated', payload);
      useChatStore.getState().updateMessage(payload);
    };

    // Message deleted
    const handleMessageDeleted = (payload: any) => {
      console.log('[Socket] Message deleted', payload);
      useChatStore.getState().deleteMessage(payload);
    };

    // Reaction added - Update only useMessagesStore (single source of truth)
    const handleReactionAdded = (payload: any) => {
      console.log('[Socket] Reaction added', payload);
      useChatStore.getState().addReaction({
        conversation_id: payload.conversation_id,
        message_id: payload.message_id,
        user_id: payload.user_id,
        reaction_type: payload.reaction_type,
      });
    };

    // Reaction removed - Update only useMessagesStore (single source of truth)
    const handleReactionRemoved = (payload: any) => {
      console.log('[Socket] Reaction removed', payload);
      useMessagesStore.getState().removeReaction(
        payload.conversation_id,
        payload.message_id,
        payload.user_id
      );
    };

    // System message - USE DEDUPLICATION
    const handleSystemMessage = (payload: any) => {
      console.log('[Socket] System message', payload);
      const messageId = payload?.id || payload?.message_id || payload?.messageId;

      // Check if message already processed to prevent duplicates
      if (messageId && isMessageProcessed(String(messageId))) {
        return;
      }

      if (messageId) {
        addProcessedMessageId(String(messageId));
      }

      useChatStore.getState().addMessage(payload);
    };

    // Chat message - Main message handler (moved from chatService)
    const handleMessage = async (payload: any) => {
      console.log('[Socket] Chat message received', payload);
      const conversationId = payload?.conversation_id || payload?.conversationId;
      const messageId = payload?.id || payload?.message_id;
      const createdAt =
        payload?.created_at ?? payload?.createdAt ?? payload?.ts ?? payload?.timestamp;

      const messageKey = String(messageId || "");

      // Deduplication: Check if message already processed
      if (messageKey && isMessageProcessed(messageKey)) {
        console.log('[Socket] Message already processed, skipping', messageKey);
        return;
      }

      if (messageKey) {
        addProcessedMessageId(messageKey);
      }

      const hasAttachmentsInPayload =
        Array.isArray(payload?.attachments) && payload.attachments.length > 0;
      const requiresDetails = Boolean(
        conversationId &&
          messageId &&
          createdAt &&
          (hasAttachmentsInPayload || payload?.attachment_key || payload?.fileKey),
      );

      if (!requiresDetails) {
        const uiMessage = toLegacyChatMessage(payload);
        const enrichedMessage = await enrichReplyToDetails(uiMessage);
        
        // ✅ FIX 1: Cập nhật message store
        useChatStore.getState().addMessage(enrichedMessage);
        
        // ✅ FIX 1: Đồng bộ với useChatsStore để cập nhật conversation list
        syncConversationWithNewMessage(payload, enrichedMessage);
        
        return;
      }

      try {
        const detailsResp = await messagesApi.getMessageDetails(
          conversationId,
          createdAt,
          messageId,
        );
        const fullMessage = detailsResp?.data || payload;
        const uiMessage = toLegacyChatMessage(fullMessage);
        const enrichedMessage = await enrichReplyToDetails(uiMessage);
        
        // ✅ FIX 1: Cập nhật message store
        useChatStore.getState().addMessage(enrichedMessage);
        
        // ✅ FIX 1: Đồng bộ với useChatsStore
        syncConversationWithNewMessage(payload, enrichedMessage);
      } catch (e) {
        console.error('[Socket] Error fetching message details', e);
        const uiMessage = toLegacyChatMessage(payload);
        const enrichedMessage = await enrichReplyToDetails(uiMessage);
        
        // ✅ FIX 1: Cập nhật message store
        useChatStore.getState().addMessage(enrichedMessage);
        
        // ✅ FIX 1: Đồng bộ với useChatsStore
        syncConversationWithNewMessage(payload, enrichedMessage);
      }
    };

    // Message pinned
    const handleMessagePinned = (payload: any) => {
      console.log('[Socket] Message pinned', payload);
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;

      // Update store with pinned status
      useMessagesStore.getState().addPinnedMessage(conversationId, messageId);

      // Update message with pinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    };

    // Message unpinned
    const handleMessageUnpinned = (payload: any) => {
      console.log('[Socket] Message unpinned', payload);
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;

      // Update store with unpinned status
      useMessagesStore.getState().removePinnedMessage(conversationId, messageId);

      // Update message with unpinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    };

    // Presence update - Update only usePresenceStore (single source of truth)
    const handlePresenceUpdate = (payload: any) => {
      console.log('[Socket] Presence update', payload);
      usePresenceStore.getState().updatePresence(payload.user_id, payload);
    };

    // Ack (for sent messages)
    const handleAck = (payload: any) => {
      console.log('[Socket] ACK', payload);
      if (payload.status === 'rejected') {
        console.error('[Socket] Message rejected', payload);
      }
    };

    // Error handling
    const handleWsError = (error: any) => {
      console.error('[Socket] WS error', error);
    };

    // Register all listeners
    console.log('[Socket] Registering listeners');
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('chat:join:ack', handleJoinAck);
    socket.on('chat:read', handleChatRead);
    socket.on('chat:message', handleMessage);
    socket.on('chat:message:updated', handleMessageUpdated);
    socket.on('chat:message:deleted', handleMessageDeleted);
    socket.on('chat:reaction:added', handleReactionAdded);
    socket.on('chat:reaction:removed', handleReactionRemoved);
    socket.on('chat.system_message', handleSystemMessage);
    socket.on('chat:message:pinned', handleMessagePinned);
    socket.on('chat:message:unpinned', handleMessageUnpinned);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('chat:ack', handleAck);
    socket.on('ws:error', handleWsError);

    // Return cleanup function
    return () => {
      console.log('[Socket] Removing listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('chat:join:ack', handleJoinAck);
      socket.off('chat:read', handleChatRead);
      socket.off('chat:message', handleMessage);
      socket.off('chat:message:updated', handleMessageUpdated);
      socket.off('chat:message:deleted', handleMessageDeleted);
      socket.off('chat:reaction:added', handleReactionAdded);
      socket.off('chat:reaction:removed', handleReactionRemoved);
      socket.off('chat.system_message', handleSystemMessage);
      socket.off('chat:message:pinned', handleMessagePinned);
      socket.off('chat:message:unpinned', handleMessageUnpinned);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('chat:ack', handleAck);
      socket.off('ws:error', handleWsError);
    };
  };

  // Actions
  const handleJoinConversation = useCallback((conversationId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:join', { conversation_id: conversationId });
    }
  }, []);

  const handleSendMessage = useCallback((payload: SocketChatSendPayload) => {
    sendMessage(
      payload.conversation_id,
      payload.body || '',
      payload.attachments
    );
  }, []);

  const handleEditMessage = useCallback((payload: SocketChatEditPayload) => {
    const createdAt = typeof payload.created_at === 'number' ? payload.created_at :
                     typeof payload.created_at === 'string' ? parseInt(payload.created_at) : Date.now();
    editMessage(payload.conversation_id, payload.message_id, payload.new_body, createdAt);
  }, []);

  const handleDeleteMessage = useCallback((payload: SocketChatDeletePayload) => {
    const createdAt = typeof payload.created_at === 'number' ? payload.created_at :
                     typeof payload.created_at === 'string' ? parseInt(payload.created_at) : Date.now();
    deleteMessage(payload.conversation_id, payload.message_id, createdAt);
  }, []);

  const handleAddReaction = useCallback((payload: SocketChatReactPayload) => {
    useChatStore.getState().addReaction({
      conversation_id: payload.conversation_id,
      message_id: payload.message_id,
      user_id: payload.user_id,
      reaction_type: payload.reaction_type,
    });
  }, []);

  const handleRemoveReaction = useCallback((messageId: string, conversationId: string) => {
    unreactMessage(conversationId, messageId);
  }, []);

  // handleSendTyping removed - use useTypingIndicator instead to avoid duplicate emits

  return {
    joinConversation: handleJoinConversation,
    sendMessage: handleSendMessage,
    editMessage: handleEditMessage,
    deleteMessage: handleDeleteMessage,
    addReaction: handleAddReaction,
    removeReaction: handleRemoveReaction,
  };
};

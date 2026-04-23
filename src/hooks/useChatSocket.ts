import { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSocket, disconnectSocket, getSocket } from '../services/socket';
import { deleteMessage, editMessage, sendMessage, unreactMessage, toLegacyChatMessage, enrichReplyToDetails } from '../services/chatService';
import * as messagesApi from '../services/messagesApi';
import { useChatStore } from '../store/chatStore';
import { useChatsStore } from '../store/useChatsStore';
import { useChatsStore as useConversationStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { mapSocketMessageEventToChatMessage } from '../types/mappers/DTOMappers';
import type {
    SocketChatDeletePayload,
    SocketChatEditPayload,
    SocketChatReactPayload,
    SocketChatSendPayload,
} from '../types/dto/SocketDTO';
import type { ChatMessage } from '../types/chat';



// Track processed message IDs for duplicate prevention
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 1000;

const addProcessedMessageId = (messageId: string) => {
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const firstId = processedMessageIds.values().next().value;
    if (firstId) {
      processedMessageIds.delete(firstId);
    }
  }
};

const isMessageProcessed = (messageId: string): boolean => {
  return processedMessageIds.has(messageId);
};

export const useChatSocket = () => {
  const { user: authUser } = useAuth();
  const {
    addMessage,
    updateMessage,
    deleteMessage: deleteMessageFromStore,
    addReaction: addReactionChatStore,
    removeReaction: removeReactionFromStore,
    updatePresence
  } = useChatStore();
  const { updateLastMessage, chats, resetUnreadCount } = useChatsStore();
  const addReactionMessageStore = useMessagesStore((state) => state.addReaction);
  const updatePresenceMap = usePresenceStore((state) => state.updatePresence);
  const addPinnedMessage = useMessagesStore((state) => state.addPinnedMessage);
  const removePinnedMessage = useMessagesStore((state) => state.removePinnedMessage);

  useEffect(() => {
    const token = authUser?.tokens?.accessToken;
    const userId = authUser?.id;

    if (!token || !userId) return;

    // Connect socket
    createSocket().then((socket) => {
      // Setup event listeners and get cleanup function
      const cleanup = setupEventListeners(socket);
      
      return cleanup;
    }).then((cleanup) => {
      // Store cleanup function for useEffect cleanup
      return cleanup;
    });

    return () => {
      const socket = getSocket();
      if (socket) {
        // Remove all listeners to prevent duplicates
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('chat:join:ack');
        socket.off('chat:read');
        socket.off('chat:message');
        socket.off('chat:message:updated');
        socket.off('chat:message:deleted');
        socket.off('chat:reaction:added');
        socket.off('chat:reaction:removed');
        socket.off('chat.system_message');
        socket.off('chat:message:pinned');
        socket.off('chat:message:unpinned');
        socket.off('presence:update');
        socket.off('chat:ack');
        socket.off('ws:error');
      }
      disconnectSocket();
    };
  }, [authUser?.tokens?.accessToken, authUser?.id]);

  const setupEventListeners = (socket: any) => {
    // Define handler functions so they can be removed later
    const handleConnect = () => {
    };

    const handleDisconnect = () => {
    };

    const handleConnectError = (error: any) => {
    };

    const handleJoinAck = (payload: any) => {
    };

    // Chat read - Sync unread count when other users read messages
    const handleChatRead = (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const readerId = payload.user_id || payload.userId;

      // Only reset unread if someone else (not me) reads the conversation
      if (conversationId && readerId && readerId !== authUser?.id) {
        resetUnreadCount(conversationId);
      }
    };

    // Message updated
    const handleMessageUpdated = (payload: any) => {
      updateMessage(payload);
    };

    // Message deleted
    const handleMessageDeleted = (payload: any) => {
      deleteMessageFromStore(payload);
    };

    // Reaction added
    const handleReactionAdded = (payload: any) => {
      addReactionChatStore(payload);
      // Also update useMessagesStore for UI consistency
      addReactionMessageStore(
        payload.conversation_id,
        payload.message_id,
        payload.user_id,
        payload.reaction_type
      );
    };

    // Reaction removed
    const handleReactionRemoved = (payload: any) => {
      removeReactionFromStore(payload);
    };

    // System message - USE DEDUPLICATION
    const handleSystemMessage = (payload: any) => {
      const messageId = payload?.id || payload?.message_id || payload?.messageId;
      
      // Check if message already processed to prevent duplicates
      if (messageId && isMessageProcessed(String(messageId))) {
        console.log('[useChatSocket] System message already processed, skipping:', messageId);
        return;
      }
      
      if (messageId) {
        addProcessedMessageId(String(messageId));
      }
      
      addMessage(payload);
    };

    // Chat message - Main message handler (moved from chatService)
    const handleMessage = async (payload: any) => {
      const conversationId = payload?.conversation_id || payload?.conversationId;
      const messageId = payload?.id || payload?.message_id;
      const createdAt =
        payload?.created_at ?? payload?.createdAt ?? payload?.ts ?? payload?.timestamp;

      const messageKey = String(messageId || "");
      
      // Deduplication: Check if message already processed
      if (messageKey && isMessageProcessed(messageKey)) {
        console.log('[useChatSocket] Message already processed, skipping:', messageId);
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
        addMessage(enrichedMessage);
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
        addMessage(enrichedMessage);
      } catch (e) {
        const uiMessage = toLegacyChatMessage(payload);
        const enrichedMessage = await enrichReplyToDetails(uiMessage);
        addMessage(enrichedMessage);
      }
    };

    // Message pinned
    const handleMessagePinned = (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;
      
      // Update store with pinned status
      addPinnedMessage(conversationId, messageId);
      
      // Update message with pinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    };

    // Message unpinned
    const handleMessageUnpinned = (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;
      
      // Update store with unpinned status
      removePinnedMessage(conversationId, messageId);
      
      // Update message with unpinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    };

    // Presence update - Sync to both stores for single source of truth
    const handlePresenceUpdate = (payload: any) => {
      // Update chatStore for backward compatibility
      updatePresence(payload.user_id, payload.status, payload.last_seen_at, payload.expires_at);
      // Update usePresenceStore as single source of truth
      updatePresenceMap(payload.user_id, payload);
    };

    // Ack (for sent messages)
    const handleAck = (payload: any) => {
      if (payload.status === 'rejected') {
      }
    };

    // Error handling
    const handleWsError = (error: any) => {
    };

    // Register all listeners
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
    addReactionChatStore(payload);
    addReactionMessageStore(
      payload.conversation_id,
      payload.message_id,
      payload.user_id,
      payload.reaction_type
    );
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

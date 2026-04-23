import { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSocket, disconnectSocket, getSocket } from '../services/socket';
import { deleteMessage, editMessage, sendMessage, unreactMessage } from '../services/chatService';
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
      // Setup event listeners
      setupEventListeners(socket);
    });

    return () => {
      disconnectSocket();
    };
  }, [authUser?.tokens?.accessToken, authUser?.id]);

  const setupEventListeners = (socket: any) => {
    socket.on('connect', () => {
    });

    socket.on('disconnect', () => {
    });

    socket.on('connect_error', (error: any) => {
    });

    socket.on('chat:join:ack', (payload: any) => {
    });

    // New message - REMOVED: handled by chatService.registerSocketListeners()
    // chatService already handles chat:message events, so we don't duplicate here

    // Chat read - Sync unread count when other users read messages
    socket.on('chat:read', (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const readerId = payload.user_id || payload.userId;

      // Only reset unread if someone else (not me) reads the conversation
      if (conversationId && readerId && readerId !== authUser?.id) {
        resetUnreadCount(conversationId);
      }
    });

    // Message updated
    socket.on('chat:message:updated', (payload: any) => {
      updateMessage(payload);
    });

    // Message deleted
    socket.on('chat:message:deleted', (payload: any) => {
      deleteMessageFromStore(payload);
    });

    // Reaction added
    socket.on('chat:reaction:added', (payload: any) => {
      addReactionChatStore(payload);
      // Also update useMessagesStore for UI consistency
      addReactionMessageStore(
        payload.conversation_id,
        payload.message_id,
        payload.user_id,
        payload.reaction_type
      );
    });

    // Reaction removed
    socket.on('chat:reaction:removed', (payload: any) => {
      removeReactionFromStore(payload);
    });

    // System message
    socket.on('chat.system_message', (payload: any) => {
      // System messages are handled like regular messages and will be added to the store
      // They will be rendered differently by MessageBubble component
      addMessage(payload);
    });

    // Message pinned
    socket.on('chat:message:pinned', (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;
      
      // Update store with pinned status
      addPinnedMessage(conversationId, messageId);
      
      // Update message with pinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    });

    // Message unpinned
    socket.on('chat:message:unpinned', (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const messageId = payload.message_id || payload.messageId;
      
      // Update store with unpinned status
      removePinnedMessage(conversationId, messageId);
      
      // Update message with unpinned status (chatStore format)
      // Note: chatStore's Message type doesn't have isPinned field, so we update useMessagesStore instead
      // The pinned status is tracked in useMessagesStore's pinnedMessagesByChatId
    });

    // Typing update - Handled by useTypingIndicator to avoid duplicates
    // socket.on('chat:typing:update', (payload: any) => {
    //   updateTypingUsers(payload);
    // });

    // Presence update - Sync to both stores for single source of truth
    socket.on('presence:update', (payload: any) => {
      // Update chatStore for backward compatibility
      updatePresence(payload.user_id, payload.status, payload.last_seen_at, payload.expires_at);
      // Update usePresenceStore as single source of truth
      updatePresenceMap(payload.user_id, payload);
    });

    // Ack (for sent messages)
    socket.on('chat:ack', (payload: any) => {
      if (payload.status === 'rejected') {
      }
    });

    // Error handling
    socket.on('ws:error', (error: any) => {
    });
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

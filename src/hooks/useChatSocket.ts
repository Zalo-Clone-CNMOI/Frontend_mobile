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
    // Debug: Log socket connection status
    console.log('[useChatSocket] 🔌 Setting up socket event listeners');
    console.log('[useChatSocket] 🔌 Socket connected:', socket.connected);
    console.log('[useChatSocket] 🔌 Socket ID:', socket.id);

    // Debug: Log when socket connects/disconnects
    socket.on('connect', () => {
      console.log('[useChatSocket] ✅ Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('[useChatSocket] ❌ Socket disconnected');
    });

    socket.on('connect_error', (error: any) => {
      console.error('[useChatSocket] ❌ Socket connect error:', error);
    });

    // Debug: Log chat:join acknowledgment
    socket.on('chat:join:ack', (payload: any) => {
      console.log('[useChatSocket] ✅ chat:join acknowledged:', payload);
    });

    // New message - Re-enabled with duplicate prevention
    // This listener handles global message updates for conversations not currently open
    socket.on('chat:message', (payload: any) => {
      const messageId = payload.message_id || payload.id;
      const conversationId = payload.conversation_id || payload.conversationId;

      // Duplicate prevention: check if message already processed
      if (messageId && isMessageProcessed(String(messageId))) {
        console.log('[useChatSocket] ⚠️ Duplicate message ignored:', messageId);
        return;
      }

      if (messageId) {
        addProcessedMessageId(String(messageId));
      }

      // Convert socket payload to ChatMessage
      const chatMessage = mapSocketMessageEventToChatMessage(payload, authUser?.id);

      // Add to useMessagesStore for the conversation
      if (conversationId) {
        useMessagesStore.getState().addMessage(conversationId, chatMessage);
      }

      // Update last message in conversation (global real-time update)
      const content = payload.body || payload.content || '';
      const type = payload.type;
      const timestamp = payload.created_at || payload.timestamp || Date.now();
      const senderId = payload.sender_id || payload.senderId;

      // Get sender name
      let senderName = payload.sender_name || payload.senderName;
      if (!senderName && senderId === authUser?.id) {
        senderName = (authUser as any)?.fullName || (authUser as any)?.name || 'Bạn';
      }

      if (conversationId) {
        const isFromMe = senderId === authUser?.id;
        const conversation = chats.find(c => c.conversationId === conversationId);
        const myLastReadAt = conversation?.myLastReadAt || 0;
        const shouldIncrementUnread = !isFromMe && timestamp > myLastReadAt;

        console.log('[useChatSocket] 📨 Global message update:', {
          conversationId,
          messageId,
          isFromMe,
          shouldIncrementUnread
        });

        updateLastMessage(conversationId, content, type, timestamp, senderId, senderName, shouldIncrementUnread);
      }
    });

    // Chat read - Sync unread count when other users read messages
    socket.on('chat:read', (payload: any) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      const readerId = payload.user_id || payload.userId;

      // Only reset unread if someone else (not me) reads the conversation
      if (conversationId && readerId && readerId !== authUser?.id) {
        console.log('[useChatSocket] 📖 Conversation read by other user:', {
          conversationId,
          readerId,
          myId: authUser?.id
        });
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
      console.log('[Socket] chat:reaction:added received:', payload);
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
      console.log('[Socket] chat:reaction:removed received:', payload);
      removeReactionFromStore(payload);
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
        console.error('Message rejected:', payload.reason);
      }
    });

    // Error handling
    socket.on('ws:error', (error: any) => {
      console.error('Socket error:', error);
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

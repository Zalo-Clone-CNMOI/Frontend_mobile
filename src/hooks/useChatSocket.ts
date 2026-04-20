import { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSocket, disconnectSocket, getSocket } from '../services/socket';
import { deleteMessage, editMessage, sendMessage, unreactMessage } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import { useChatsStore } from '../store/useChatsStore';
import { useChatsStore as useConversationStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { mapSocketMessageEventToChatMessage } from '../types/mappers/DTOMappers';
import type {
    SocketChatDeletePayload,
    SocketChatEditPayload,
    SocketChatReactPayload,
    SocketChatSendPayload,
} from '../types/dto/SocketDTO';



export const useChatSocket = () => {
  const { user: authUser } = useAuth();
  const {
    addMessage,
    updateMessage,
    deleteMessage: deleteMessageFromStore,
    addReaction,
    removeReaction: removeReactionFromStore,
    updateTypingUsers,
    updatePresence
  } = useChatStore();
  const { updateLastMessage, chats } = useChatsStore();

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

    // New message
    socket.on('chat:message', (payload: any) => {
      // Debug: Log full socket payload
      console.log('[useChatSocket] 📨 Received socket payload:', {
        message_id: payload.message_id || payload.id,
        conversation_id: payload.conversation_id || payload.conversationId,
        sender_id: payload.sender_id || payload.senderId,
        body: payload.body,
        type: payload.type,
        has_forwarded_from: !!payload.forwarded_from,
        forwarded_from: payload.forwarded_from,
        created_at: payload.created_at,
        timestamp: payload.timestamp,
      });

      // Debug: Log forwarded message from socket
      if (payload.forwarded_from) {
        console.log('[useChatSocket] ✅✅✅ FORWARDED MESSAGE RECEIVED FROM SOCKET:', payload.forwarded_from);
        console.log('[useChatSocket] ✅✅✅ Full forwarded payload:', payload);
      }

      // Convert socket payload to ChatMessage (handles forwarded_from -> forwardedFrom)
      const chatMessage = mapSocketMessageEventToChatMessage(payload, authUser?.id);

      // Debug: Log converted ChatMessage
      console.log('[useChatSocket] 🔄 Converted ChatMessage:', {
        id: chatMessage.id,
        conversationId: chatMessage.conversationId,
        senderId: chatMessage.senderId,
        text: chatMessage.text,
        type: chatMessage.type,
        has_forwardedFrom: !!chatMessage.forwardedFrom,
        forwardedFrom: chatMessage.forwardedFrom,
        timestamp: chatMessage.timestamp,
      });

      // Add to chatStore (for backward compatibility)
      addMessage(payload);

      // Add to useMessagesStore (main store used by UI)
      const conversationId = payload.conversation_id || payload.conversationId;
      if (conversationId) {
        useMessagesStore.getState().addMessage(conversationId, chatMessage);
      }

      // Update last message in conversation
      const content = payload.body || payload.content || '';
      const type = payload.type;
      const timestamp = payload.created_at || payload.timestamp || Date.now();
      const senderId = payload.sender_id || payload.senderId;

      // Get sender name from conversation or current user
      let senderName = payload.sender_name || payload.senderName;
      if (!senderName) {
        if (senderId === authUser?.id) {
          senderName = (authUser as any)?.fullName || (authUser as any)?.name || 'Bạn';
        }
      }

      if (conversationId) {
        const isFromMe = senderId === authUser?.id;
        console.log('[useChatSocket] Updating last message:', { conversationId, senderId, authUserId: authUser?.id, isFromMe, shouldIncrementUnread: !isFromMe });
        updateLastMessage(conversationId, content, type, timestamp, senderId, senderName, !isFromMe);
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
      addReaction(payload);
    });

    // Reaction removed
    socket.on('chat:reaction:removed', (payload: any) => {
      console.log('[Socket] chat:reaction:removed received:', payload);
      removeReactionFromStore(payload);
    });

    // Typing update
    socket.on('chat:typing:update', (payload: any) => {
      updateTypingUsers(payload);
    });

    // Presence update
    socket.on('presence:update', (payload: any) => {
      updatePresence(payload.user_id, payload.status, payload.last_seen_at, payload.expires_at);
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
    addReaction(payload);
  }, []);

  const handleRemoveReaction = useCallback((messageId: string, conversationId: string) => {
    unreactMessage(conversationId, messageId);
  }, []);

  const handleSendTyping = useCallback((conversationId: string, username: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:typing', { conversation_id: conversationId, username });
    }
  }, []);

  return {
    joinConversation: handleJoinConversation,
    sendMessage: handleSendMessage,
    editMessage: handleEditMessage,
    deleteMessage: handleDeleteMessage,
    addReaction: handleAddReaction,
    removeReaction: handleRemoveReaction,
    sendTyping: handleSendTyping,
  };
};

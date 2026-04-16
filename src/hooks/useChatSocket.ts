import { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSocket, disconnectSocket, getSocket } from '../services/socket';
import { deleteMessage, editMessage, sendMessage, unreactMessage } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import { useChatsStore } from '../store/useChatsStore';
import { useChatsStore as useConversationStore } from '../store/useChatsStore';
import type {
    SocketChatDeletePayload,
    SocketChatEditPayload,
    SocketChatReactPayload,
    SocketChatSendPayload,
} from '../types/dto/SocketDTO';

// Helper function to detect message type from content
const detectMessageType = (content: string): string => {
  if (!content) return 'text';
  
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.match(/\.(mp4|mov|avi|mkv|webm)$/)) return 'video';
  if (lowerContent.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
  if (lowerContent.match(/\.(pdf|doc|docx|xls|xlsx|txt|zip)$/)) return 'file';
  if (lowerContent.match(/\.(mp3|wav|ogg|m4a)$/)) return 'voice';
  
  return 'text';
};

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
    // New message
    socket.on('chat:message', (payload: any) => {
      addMessage(payload);
      // Update last message in conversation
      const conversationId = payload.conversation_id || payload.conversationId;
      const content = payload.body || payload.content || '';
      // Detect type from content if Backend doesn't send type
      const type = payload.type || detectMessageType(content);
      const timestamp = payload.created_at || payload.timestamp || Date.now();
      const senderId = payload.sender_id || payload.senderId;
      
      // Get sender name from conversation or current user
      let senderName = payload.sender_name || payload.senderName;
      if (!senderName) {
        // If sender is current user, use their name
        if (senderId === authUser?.id) {
          senderName = (authUser as any)?.fullName || (authUser as any)?.name || 'Bạn';
        } else {
          // Try to get from conversation members
          const conversation = chats.find(c => c.conversationId === conversationId);
          // For now, leave as undefined - will be handled by ChatListItem
        }
      }
      
      if (conversationId) {
        updateLastMessage(conversationId, content, type, timestamp, senderId, senderName);
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
    sendMessage(payload);
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

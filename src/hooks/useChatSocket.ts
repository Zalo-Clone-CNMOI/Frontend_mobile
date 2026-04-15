import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    createSocket,
    deleteMessage,
    disconnectSocket,
    editMessage,
    joinConversation,
    offAck,
    offError,
    offMessage,
    offMessageDeleted,
    offMessageUpdated,
    offPresenceUpdate,
    offReactionAdded,
    offReactionRemoved,
    offTypingUpdate,
    onAck,
    onError,
    onMessage,
    onMessageDeleted,
    onMessageUpdated,
    onPresenceUpdate,
    onReactionAdded,
    onReactionRemoved,
    onTypingUpdate,
    removeReaction,
    sendHeartbeat,
    sendMessage,
    sendTyping
} from '../services/socket';
import { useChatStore } from '../store/chatStore';
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
  } = useChatStore();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const token = authUser?.tokens?.accessToken;
    const userId = authUser?.id;

    if (!token || !userId) return;

    // Connect socket
    createSocket({
      url: '',
      token,
      userId,
    });

    // Setup event listeners
    const unsubscribe = setupEventListeners();

    // Start heartbeat (every 30s)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    return () => {
      unsubscribe();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      disconnectSocket();
    };
  }, [authUser?.tokens?.accessToken, authUser?.id]);

  const setupEventListeners = () => {
    // New message
    onMessage((payload) => {
      addMessage(payload);
      // Show notification if not in current conversation
    });

    // Message updated
    onMessageUpdated((payload) => {
      updateMessage(payload);
    });

    // Message deleted
    onMessageDeleted((payload) => {
      deleteMessageFromStore(payload);
    });

    // Reaction added
    onReactionAdded((payload) => {
      addReaction(payload);
    });

    // Reaction removed
    onReactionRemoved((payload) => {
      removeReactionFromStore(payload);
    });

    // Typing update
    onTypingUpdate((payload) => {
      updateTypingUsers(payload);
    });

    // Presence update
    onPresenceUpdate((payload) => {
      // Update user presence in store
      console.log('Presence update:', payload);
    });

    // Ack (for sent messages)
    onAck((payload) => {
      if (payload.status === 'rejected') {
        // Handle rejection (show error, retry, etc.)
        console.error('Message rejected:', payload.reason);
      }
    });

    // Error handling
    onError((error) => {
      console.error('Socket error:', error);
      // Show error toast
    });

    return () => {
      offMessage();
      offMessageUpdated();
      offMessageDeleted();
      offReactionAdded();
      offReactionRemoved();
      offTypingUpdate();
      offPresenceUpdate();
      offAck();
      offError();
    };
  };

  // Actions
  const handleJoinConversation = useCallback((conversationId: string) => {
    joinConversation(conversationId);
  }, []);

  const handleSendMessage = useCallback((payload: SocketChatSendPayload) => {
    sendMessage(payload);
  }, []);

  const handleEditMessage = useCallback((payload: SocketChatEditPayload) => {
    editMessage(payload);
  }, []);

  const handleDeleteMessage = useCallback((payload: SocketChatDeletePayload) => {
    deleteMessage(payload);
  }, []);

  const handleAddReaction = useCallback((payload: SocketChatReactPayload) => {
    addReaction(payload);
  }, []);

  const handleRemoveReaction = useCallback((messageId: string, conversationId: string) => {
    removeReaction(messageId, conversationId);
  }, []);

  const handleSendTyping = useCallback((conversationId: string, username: string) => {
    sendTyping(conversationId, username);
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

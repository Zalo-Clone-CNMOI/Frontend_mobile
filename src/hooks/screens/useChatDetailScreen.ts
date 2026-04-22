import { useAuth } from '@/src/contexts/AuthContext';
import {
  usePresenceHeartbeat,
  type PresenceUpdatePayload,
} from '@/src/realtime';
import { useTypingIndicator } from '@/src/hooks/useTypingIndicator';
import {
    fetchMoreMessages,
    loadInitialMessages,
    reactMessage,
    registerHandlers,
    deleteMessage as sendSocketDeleteMessage,
    editMessage as sendSocketEditMessage,
    sendMessage as sendSocketMessage,
    unreactMessage,
    forwardMessage,
    markConversationAsRead,
} from '@/src/services/chatService';
import { searchMessages as searchMessagesApi } from '@/src/services/messagesApi';
import { connectSocket } from '@/src/services/socket';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { usePresenceStore } from '@/src/store/usePresenceStore';
import type { ChatMessage } from '@/src/types/chat';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

const EMPTY_MESSAGES: ChatMessage[] = [];

const getSingleRouteParam = (
  value?: string | string[],
): string => (Array.isArray(value) ? value[0] || '' : value || '');

export function useChatDetailScreenLogic() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    jumpToMessageId?: string | string[];
  }>();
  const chatId = getSingleRouteParam(params?.id).trim();
  const jumpToMessageId = getSingleRouteParam(params?.jumpToMessageId).trim() || undefined;
  const { t } = useTranslation();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const isKeyboardVisible = false;

  const keyboardOffset = headerHeight;

  const title = useMemo(() => {
    const routeName = getSingleRouteParam(params?.name).trim();
    if (routeName.length > 0) return routeName;
    return t('chat.default_title');
  }, [params?.name, t]);

  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const flashListRef = useRef<any>(null);
  const loadedCursorRef = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingSocket, setTypingSocket] = useState<Awaited<ReturnType<typeof connectSocket>> | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<ChatMessage | null>(null);
  const [isMessageActionMenuVisible, setIsMessageActionMenuVisible] = useState(false);
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);

  // Search messages state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messages = useMessagesStore((state) => state.messagesByChatId[chatId] || EMPTY_MESSAGES);
  const addMessage = useMessagesStore((state) => state.addMessage);
  const setMessagesForChat = useMessagesStore((state) => state.setMessagesForChat);
  const updateMessage = useMessagesStore((state) => state.updateMessage);
  const deleteMessage = useMessagesStore((state) => state.deleteMessage);
  const revokeMessage = useMessagesStore((state) => state.revokeMessage);
  const addReaction = useMessagesStore((state) => state.addReaction);
  const removeReaction = useMessagesStore((state) => state.removeReaction);
  const updateChat = useChatsStore((state) => state.updateChat);
  const updateLastMessage = useChatsStore((state) => state.updateLastMessage);
  const resetUnreadCount = useChatsStore((state) => state.resetUnreadCount);

  const currentChat = useChatsStore((state) => state.chats.find((chat) => chat.conversationId === chatId));
  const fetchConversationDetail = useConversationDetailStore((state) => state.fetchConversationDetail);

  // Fetch conversation details with forceRefresh when opening a conversation
  useEffect(() => {
    if (chatId && currentChat?.type === 'group') {
      fetchConversationDetail(chatId, true).catch(err => {
        console.error('[useChatDetailScreen] Failed to fetch conversation details:', err);
      });
    }
  }, [chatId, currentChat?.type, fetchConversationDetail]);

  // Presence state - use global store for persistence
  const presenceMap = usePresenceStore((state) => state.presenceMap);
  const updatePresence = usePresenceStore((state) => state.updatePresence);

  // Use new realtime hooks
  usePresenceHeartbeat({
    socket: typingSocket,
    onPresenceUpdate: (payload) => {
      updatePresence(payload.user_id, payload);
    },
    onUnauthorized: () => {
      // Could trigger logout or token refresh here
    },
  });


  // Wrap useTypingIndicator in try-catch to catch any errors
  let typingIndicatorResult;
  try {
    typingIndicatorResult = useTypingIndicator({
      socket: typingSocket,
      conversationId: chatId,
      myUserId: String(user?.id || ''),
      enabled: true,
      throttleMs: 1000,
    });
  } catch (error) {
    // Fallback values
    typingIndicatorResult = {
      emitTyping: () => {},
      typingText: '',
      typingUsers: [],
      isTypingVisible: false,
    };
  }

  const { emitTyping, typingText, typingUsers, isTypingVisible } = typingIndicatorResult;

  useEffect(() => {
    let active = true;
    
    // Only load if we have a valid chatId
    if (!chatId) return;
    
    loadInitialMessages(chatId)
      .then((res) => {
        if (!active) return;
        // Add conversation avatar to initial messages
        const messagesWithAvatar = (res.messages || []).map(msg => ({
          ...msg,
          senderAvatar: currentChat?.avatar || null,
          senderName: currentChat?.name || msg.senderName,
        }));
        setMessagesForChat(chatId, messagesWithAvatar);
        setNextCursor(res.nextCursor || undefined);
        setHasMore(Boolean(res.hasMore));

        // Mark conversation as read and reset unread count
        markConversationAsRead(chatId);
        resetUnreadCount(chatId);

        // Handle jumpToMessageId - scroll to specific message
        if (jumpToMessageId && messagesWithAvatar.length > 0) {
          const messageIndex = messagesWithAvatar.findIndex(m =>
            m.serverMessageId === jumpToMessageId || m.id === jumpToMessageId
          );

          if (messageIndex >= 0) {
            // Found message in current list, scroll to it
            setTimeout(() => {
              flashListRef.current?.scrollToIndex({
                index: messageIndex,
                animated: true,
                viewPosition: 0.5,
              });
              setHighlightedMessageId(jumpToMessageId);
              setTimeout(() => setHighlightedMessageId(null), 2000);
            }, 100);
          } else {
            // Message not in current list (might need to load more)
            // For now, just scroll to end
            setTimeout(() => {
              flashListRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }
        } else {
          // Normal case - scroll to end
          setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: false });
          }, 50);
        }
      })
      .catch((err) => {
        const errorDetails = err instanceof Error ? {
          message: err.message,
          stack: err.stack,
          name: err.name
        } : err;
        console.error('[useChatDetailScreen] Error loading messages:', JSON.stringify(errorDetails, null, 2));
      });
    return () => {
      active = false;
    };
  }, [chatId, currentChat?.conversationId, jumpToMessageId]); // Remove setMessagesForChat from dependencies

  const handleLoadMore = useCallback(async () => {
    if (!chatId || !hasMore || !nextCursor || isLoadingMore) return;
    if (loadedCursorRef.current === nextCursor) return;

    setIsLoadingMore(true);
    try {
      const res = await fetchMoreMessages(chatId, nextCursor, 50);
      const olderMessages = (res.messages || []).map(msg => ({
        ...msg,
        senderAvatar: currentChat?.avatar || null,
        senderName: currentChat?.name || msg.senderName,
      }));
      const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
      const mergedMap = new Map<string, ChatMessage>();
      [...olderMessages, ...current].forEach((m) => mergedMap.set(m.id, m));
      const merged = Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      setMessagesForChat(chatId, merged);
      setNextCursor(res.nextCursor || undefined);
      setHasMore(Boolean(res.hasMore));
    } catch (error) {
      loadedCursorRef.current = null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore, isLoadingMore, nextCursor, setMessagesForChat, currentChat]);

  useEffect(() => {
    const handlers = {
      onMessage: (msg: ChatMessage) => {
        if (msg.conversationId === chatId) {
          const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
          const incomingKey = String(msg.serverMessageId || msg.id || '').trim();
          const existing =
            current.find((m) => m.id === msg.id) ||
            (incomingKey
              ? current.find(
                  (m) =>
                    String(m.serverMessageId || '').trim() === incomingKey ||
                    String(m.id || '').trim() === incomingKey,
                )
              : undefined);

          // Additional deduplication by signature (timestamp, senderId, text) for optimistic updates
          const existingBySignature =
            existing ||
            current.find(
              (m) =>
                m.timestamp === msg.timestamp &&
                (m.senderId || '') === (msg.senderId || '') &&
                (m.text || '') === (msg.text || ''),
            );

          // Add conversation avatar to incoming messages
          const messageWithAvatar = {
            ...msg,
            senderAvatar: currentChat?.avatar || null,
            senderName: currentChat?.name || msg.senderName,
          };

          if (existingBySignature) {
            updateMessage(chatId, existingBySignature.id, {
              text: msg.text ?? existingBySignature.text,
              timestamp: msg.timestamp ?? existingBySignature.timestamp,
              type: msg.type ?? existingBySignature.type,
              fileInfo: msg.fileInfo ?? existingBySignature.fileInfo,
              replyTo: msg.replyTo ?? existingBySignature.replyTo,
              status: msg.status ?? existingBySignature.status,
              isEdited: msg.isEdited ?? existingBySignature.isEdited,
              editedAt: msg.editedAt ?? existingBySignature.editedAt,
              serverMessageId:
                existingBySignature.serverMessageId ||
                msg.serverMessageId ||
                (incomingKey && incomingKey !== existingBySignature.id ? incomingKey : undefined),
              senderAvatar: currentChat?.avatar || null,
              senderName: currentChat?.name || msg.senderName,
            });
          } else {
            addMessage(chatId, messageWithAvatar);
            // Update conversation lastMessage with auto-sort
            const isFromMe = msg.senderId === user?.id;
            const shouldIncrementUnread = !isFromMe;
            updateLastMessage(
              chatId,
              msg.text || '',
              msg.type || 'text',
              msg.timestamp || Date.now(),
              msg.senderId,
              msg.senderName,
              shouldIncrementUnread
            );
          }

          if (typingSocket) typingSocket.emit('chat:read', { conversation_id: chatId });
          setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      },
      onMessageUpdated: (msg: ChatMessage) => {
        if (msg.conversationId === chatId) {
          const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
          const match =
            current.find((m) => m.id === msg.id) ||
            current.find((m) => (m.serverMessageId || '') === (msg.serverMessageId || msg.id || ''));

          if (match) {
            const oldText = String(match.text || '');
            const nextText = String(msg.text || '');
            const oldEditedAt = Number(match.editedAt || 0);
            const nextEditedAt = Number(msg.editedAt || 0);
            if (oldText === nextText && oldEditedAt === nextEditedAt) return;
            updateMessage(chatId, match.id, {
              text: msg.text ?? match.text,
              isEdited: true,
              editedAt: msg.editedAt || Date.now(),
            });
          }
        }
      },
      onMessageDeleted: (info: any) => {
        if (info.conversationId === chatId) {
          const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
          const match =
            current.find((m) => m.id === info.messageId) ||
            current.find((m) => (m.serverMessageId || '') === String(info.messageId || '').trim());
          if (match) {
            deleteMessage(chatId, match.id);
          }
        }
      },
      onReactionAdded: (info: any) => {
        if (info.conversationId === chatId) {
          addReaction(chatId, info.messageId, info.userId, info.reactionType);
        }
      },
      onReactionRemoved: (info: any) => {
        if (info.conversationId === chatId) {
          removeReaction(chatId, info.messageId, info.userId);
        }
      },
    };

    registerHandlers(handlers);


    const handleRead = (data: any) => {
      if (data.conversation_id === chatId) {
        const currentMessages = useMessagesStore.getState().messagesByChatId[chatId] || [];
        currentMessages.forEach((m) => {
          if (m.fromMe && m.status !== 'read') {
            updateMessage(chatId, m.id, { status: 'read' });
          }
        });
      }
    };

    let active = true;
    let connectedSocket: Awaited<ReturnType<typeof connectSocket>> | null = null;

    const bindSocket = async () => {
      connectedSocket = await connectSocket();
      if (!active || !connectedSocket) return;

      setTypingSocket(connectedSocket);
      // Join the conversation room to receive typing events
      connectedSocket.emit('chat:join', { conversation_id: chatId });
      connectedSocket.emit('chat:read', { conversation_id: chatId });
      connectedSocket.on('chat:read', handleRead);
    };

    bindSocket();

    return () => {
      active = false;
      registerHandlers({});
      if (connectedSocket) {
        connectedSocket.off('chat:read', handleRead);
      }
    };
  }, [addMessage, addReaction, chatId, deleteMessage, removeReaction, typingSocket, updateMessage]);

  const handleSendFiles = useCallback(async (files: any[]) => {
    if (files.length === 0) return;

    const fallbackLabel = files.length === 1
      ? (files[0]?.name || files[0]?.uri?.split('/')?.pop() || 'File')
      : `${files.length} files`;

    try {
      const { optimisticMessage, sendPromise } = await sendSocketMessage(
        chatId,
        fallbackLabel,
        files,
        { replyToMessage: replyingMessage },
      );
      addMessage(chatId, optimisticMessage);
      await sendPromise;
      updateMessage(chatId, optimisticMessage.id, { status: 'sent' });
    } catch (error) {
      if ((error as any)?.message_id) {
        updateMessage(chatId, (error as any).message_id, { status: 'failed' });
      }
      const reason = (error as any)?.reason || (error as any)?.message || 'Kiểm tra lại file đính kèm';
      Alert.alert('Gửi file thất bại', `Không thể gửi file: ${reason}`);
    }

    setReplyingMessage(null);
    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [addMessage, chatId, replyingMessage, updateMessage]);

  const openMessageActions = useCallback((msg: ChatMessage) => {
    setSelectedActionMessage(msg);
    setIsMessageActionMenuVisible(true);
  }, []);

  const closeMessageActions = useCallback(() => {
    setIsMessageActionMenuVisible(false);
    setSelectedActionMessage(null);
  }, []);

  const handleReplyAction = useCallback((msg: ChatMessage) => {
    if (msg.isRevoked) return;
    setReplyingMessage(msg);
  }, []);

  const handleEditAction = useCallback((msg: ChatMessage) => {
    if (!msg.fromMe) return;
    if (msg.isRevoked) return;
    setEditingMessage(msg);
    setInput(msg.text || '');
  }, []);

  const handleRevokeAction = useCallback((msg: ChatMessage) => {
    if (!msg.fromMe) return;
    revokeMessage(chatId, msg.id);
    if (replyingMessage?.id === msg.id) setReplyingMessage(null);
    if (editingMessage?.id === msg.id) setEditingMessage(null);
  }, [chatId, editingMessage?.id, replyingMessage?.id, revokeMessage]);

  const handleForwardAction = useCallback((msg: ChatMessage) => {
    setSelectedActionMessage(msg);
    // Use setTimeout to ensure state update is processed before opening modal
    setTimeout(() => {
      setIsForwardModalVisible(true);
    }, 0);
  }, []);

  const handleForward = useCallback(async (message: ChatMessage, targetConversationIds: string[], optionalMessage?: string) => {
    if (!message || !targetConversationIds || targetConversationIds.length === 0) {
      console.log('[handleForward] Invalid input:', { message: !!message, targetCount: targetConversationIds?.length });
      return;
    }
    try {
      console.log('[handleForward] Starting forward operation:', {
        messageId: message.id,
        serverMessageId: message.serverMessageId,
        targetCount: targetConversationIds.length,
        targets: targetConversationIds,
        hasOptionalMessage: !!optionalMessage
      });
      const result = await forwardMessage(message, targetConversationIds);
      console.log('[handleForward] Forward completed:', result);
      const acceptedCount = result?.results?.filter((r: any) => r.status === 'accepted').length || 0;
      const totalCount = targetConversationIds.length;

      // Send optional message to accepted conversations if provided
      if (optionalMessage && optionalMessage.trim()) {
        const acceptedConversationIds = result?.results
          ?.filter((r: any) => r.status === 'accepted')
          .map((r: any) => r.conversation_id) || [];
        
        console.log('[handleForward] Sending optional message to:', acceptedConversationIds);
        
        // Wait a bit to ensure forwarded message arrives first
        await new Promise(resolve => setTimeout(resolve, 500));
        
        for (const conversationId of acceptedConversationIds) {
          try {
            const { optimisticMessage, sendPromise } = await sendSocketMessage(
              conversationId,
              optionalMessage.trim(),
              undefined,
              undefined
            );
            addMessage(conversationId, optimisticMessage);
            await sendPromise;
            updateMessage(conversationId, optimisticMessage.id, { status: 'sent' });
          } catch (error) {
            console.error('[handleForward] Failed to send optional message to:', conversationId, error);
          }
        }
      }

      Alert.alert(
        t('chat.forward_success', { defaultValue: 'Đã chuyển tiếp tin nhắn' }),
        `${acceptedCount}/${totalCount} cuộc trò chuyện`
      );
    } catch (error: any) {
      console.error('[handleForward] Forward failed:', error?.message || error);
      const errorMessage = error?.message || String(error);

      // Handle specific error codes according to integration guide
      if (errorMessage === 'UNAUTHORIZED') {
        Alert.alert(
          t('auth.session_expired', { defaultValue: 'Phiên đăng nhập hết hạn' }),
          t('auth.please_login_again', { defaultValue: 'Vui lòng đăng nhập lại' })
        );
      } else if (errorMessage === 'FORBIDDEN') {
        Alert.alert(
          t('chat.forward_no_permission', { defaultValue: 'Không có quyền' }),
          t('chat.forward_no_permission_desc', { defaultValue: 'Bạn không có quyền forward tin nhắn này' })
        );
      } else if (errorMessage === 'SOURCE_NOT_FOUND') {
        Alert.alert(
          t('chat.forward_source_not_found', { defaultValue: 'Tin nhắn không tồn tại' }),
          t('chat.forward_source_not_found_desc', { defaultValue: 'Tin nhắn gốc không còn tồn tại' })
        );
      } else if (errorMessage === 'RATE_LIMITED') {
        Alert.alert(
          t('chat.rate_limited', { defaultValue: 'Quá nhiều yêu cầu' }),
          t('chat.rate_limited_desc', { defaultValue: 'Vui lòng thử lại sau' })
        );
      } else {
        Alert.alert(
          t('chat.forward_failed', { defaultValue: 'Chuyển tiếp thất bại' }),
          errorMessage
        );
      }
    }
  }, [t, addMessage, updateMessage]);

  const handleDeleteAction = useCallback(async (msg: ChatMessage) => {
    try {
      // Xóa local ngay lập tức trước khi gửi socket request
      deleteMessage(chatId, msg.id);

      const createdAt = typeof msg.timestamp === 'number' ? msg.timestamp :
                       typeof msg.timestamp === 'string' ? parseInt(msg.timestamp) : Date.now();
      await sendSocketDeleteMessage(chatId, msg.serverMessageId || msg.id, createdAt);
    } catch (error) {
    }
    if (replyingMessage?.id === msg.id) setReplyingMessage(null);
    if (editingMessage?.id === msg.id) setEditingMessage(null);
  }, [chatId, editingMessage?.id, replyingMessage?.id, deleteMessage]);

  const handleReactAction = useCallback(async (msg: ChatMessage, reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry") => {
    try {
      // Emit socket event to backend
      await reactMessage(chatId, msg.serverMessageId || msg.id, reaction);
      // Update local store immediately for UI
      const userId = user?.id || (user as any)?._id || (user as any)?.userId;
      if (userId) {
        addReaction(chatId, msg.serverMessageId || msg.id, userId, reaction);
      }
    } catch (error) {
      console.error('[handleReactAction] Error:', error);
    }
    closeMessageActions();
  }, [chatId, closeMessageActions, user, addReaction]);

  const handleReactMultiple = useCallback(async (msg: ChatMessage, reactions: ("like" | "love" | "haha" | "wow" | "sad" | "angry")[]) => {
    try {
      const userId = user?.id || (user as any)?._id || (user as any)?.userId;
      // Send all reactions in parallel
      await Promise.all(
        reactions.map(async (reaction) => {
          await reactMessage(chatId, msg.serverMessageId || msg.id, reaction);
          if (userId) {
            addReaction(chatId, msg.serverMessageId || msg.id, userId, reaction);
          }
        })
      );
    } catch (error) {
      console.error('[handleReactMultiple] Error:', error);
    }
    closeMessageActions();
  }, [chatId, closeMessageActions, user, addReaction]);

  const handleUnreactAction = useCallback(async (messageId: string, reactionType: string) => {
    try {
      // Emit socket event to backend
      await unreactMessage(chatId, messageId);
      // Update local store immediately for UI
      const userId = user?.id || (user as any)?._id || (user as any)?.userId;
      if (userId) {
        removeReaction(chatId, messageId, userId);
      }
    } catch (error) {
      console.error('[handleUnreactAction] Error:', error);
    }
  }, [chatId, user, removeReaction]);

  const handleReuseRevokedMessage = useCallback((msg: ChatMessage) => {
    const restoredText = String(msg.revokedBackupText || msg.text || '').trim();
    if (!restoredText) return;
    setReplyingMessage(null);
    setInput(restoredText);
  }, []);

  const handleRevokedRestoreExpired = useCallback((messageId: string) => {
    const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
    const target = current.find((m) => m.id === messageId);
    if (!target || !target.isRevoked || !target.revokedBackupText) return;
    updateMessage(chatId, messageId, {
      revokedBackupText: '',
      revokeRestoreUntil: undefined,
    });
  }, [chatId, updateMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInput('');
  }, []);

  const handleJumpToReplySource = useCallback((msg: ChatMessage) => {
    const sourceId = String(msg.replyTo?.id || '').trim();
    if (!sourceId) return;
    const current = useMessagesStore.getState().messagesByChatId[chatId] || [];
    const index = current.findIndex(
      (m) => String(m.id || '').trim() === sourceId || String(m.serverMessageId || '').trim() === sourceId,
    );
    if (index < 0) return;
    flashListRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
  }, [chatId]);

  const onSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (editingMessage) {
      try {
        const createdAt = typeof editingMessage.timestamp === 'number' ? editingMessage.timestamp :
                         typeof editingMessage.timestamp === 'string' ? parseInt(editingMessage.timestamp) : Date.now();
        await sendSocketEditMessage(chatId, editingMessage.serverMessageId || editingMessage.id, trimmed, createdAt);
        updateMessage(chatId, editingMessage.id, {
          text: trimmed,
          isEdited: true,
          editedAt: Date.now(),
        });
        // Update conversation lastMessage when editing (no unread increment for edits)
        updateLastMessage(
          chatId,
          trimmed,
          editingMessage.type || 'text',
          Date.now(),
          user?.id,
          (user as any)?.fullName || (user as any)?.name,
          false // Don't increment unread for edits
        );
        setInput('');
        setEditingMessage(null);
      } catch (error) {
      }
      return;
    }

    try {
      const { optimisticMessage, sendPromise } = await sendSocketMessage(
        chatId,
        trimmed,
        undefined,
        { replyToMessage: replyingMessage },
      );
      addMessage(chatId, optimisticMessage);
      // Update conversation lastMessage when sending new message (no unread increment for own messages)
      updateLastMessage(
        chatId,
        trimmed,
        optimisticMessage.type || 'text',
        Date.now(),
        user?.id,
        (user as any)?.fullName || (user as any)?.name,
        false // Don't increment unread for own messages
      );
      await sendPromise;
      updateMessage(chatId, optimisticMessage.id, { status: 'sent' });
      setInput('');
      setReplyingMessage(null);
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      if ((error as any)?.message_id) {
        updateMessage(chatId, (error as any).message_id, { status: 'failed' });
      }
    }
  }, [addMessage, chatId, editingMessage, input, replyingMessage, updateMessage, updateChat]);

  const handleTypingStart = useCallback(() => {
    if (!chatId) return;
    const username = (user as any)?.fullName || (user as any)?.name || 'Bạn';
    emitTyping(username);
  }, [chatId, emitTyping, user]);

  const handleTypingStop = useCallback(() => {
    // Backend handles typing timeout automatically
    // This clears local typing state to stop emitting events
    // No explicit stop event in backend - relies on timeout
  }, []);

  // Search messages function
  const handleSearchMessages = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchMessagesApi(chatId, { q: query.trim() });
      const items = response?.data?.items || [];

      // Convert backend messages to frontend format
      const convertedMessages: ChatMessage[] = items.map((apiMsg: any) => {

        return {
          id: apiMsg.messageId || apiMsg.id,
          serverMessageId: apiMsg.messageId || apiMsg.id,
          conversationId: apiMsg.conversationId,
          senderId: apiMsg.senderId,
          fromMe: apiMsg.senderId === user?.id || apiMsg.senderId === (user as any)?._id,
          type: apiMsg.attachments?.[0]?.type === 'document' ? 'file' :
                apiMsg.attachments?.[0]?.type === 'audio' ? 'voice' :
                apiMsg.attachments?.[0]?.type || 'text',
          text: apiMsg.body || '',
          timestamp: typeof apiMsg.createdAt === 'number' ? apiMsg.createdAt : Date.now(),
          fileInfo: apiMsg.attachments?.[0] ? {
            uri: apiMsg.attachments[0].url || apiMsg.attachments[0].key || '',
            name: apiMsg.attachments[0].name || 'File',
            size: apiMsg.attachments[0].size || 0,
            mimeType: apiMsg.attachments[0].contentType || apiMsg.attachments[0].type || '',
          } : undefined,
          replyTo: apiMsg.replyToMessageId ? { id: apiMsg.replyToMessageId } : undefined,
          forwardedFrom: apiMsg.forwardedFrom,
          reactions: apiMsg.reactions,
          isEdited: Boolean(apiMsg.editedAt),
          editedAt: apiMsg.editedAt,
          isRevoked: Boolean(apiMsg.isDeleted || apiMsg.deletedAt),
          attachments: apiMsg.attachments,
          senderAvatar: currentChat?.avatar || null,
          senderName: currentChat?.name || '',
        };
      });

      // Sort search results from oldest to newest (like Zalo)
      const sortedResults = convertedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setSearchResults(sortedResults);
      // Reset index when new search
      setCurrentSearchIndex(0);
    } catch (error) {
      console.error('[handleSearchMessages] Error:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSearching(false);
    }
  }, [chatId, currentChat?.avatar, currentChat?.name, user]);

  // Toggle search mode
  const toggleSearchMode = useCallback(() => {
    setIsSearchMode(prev => !prev);
    if (isSearchMode) {
      // Exiting search mode
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isSearchMode]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setHighlightedMessageId(null);
  }, []);

  // Navigate to next/previous search result
  const navigateSearchResult = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    const newIndex = direction === 'next'
      ? (currentSearchIndex + 1) % searchResults.length
      : (currentSearchIndex - 1 + searchResults.length) % searchResults.length;

    setCurrentSearchIndex(newIndex);
    const targetMessage = searchResults[newIndex];
    setHighlightedMessageId(targetMessage.id);

    // Scroll to the message in FlashList
    const currentMessages = useMessagesStore.getState().messagesByChatId[chatId] || [];
    const messageIndex = currentMessages.findIndex(m =>
      m.id === targetMessage.id || m.serverMessageId === targetMessage.serverMessageId
    );

    if (messageIndex >= 0 && flashListRef.current) {
      flashListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [searchResults, currentSearchIndex, chatId]);

  // Jump to message and exit search mode
  const jumpToMessage = useCallback((message: ChatMessage) => {
    // Exit search mode
    setIsSearchMode(false);
    setHighlightedMessageId(message.id);

    // Scroll to the message in all messages list
    const currentMessages = useMessagesStore.getState().messagesByChatId[chatId] || [];
    const messageIndex = currentMessages.findIndex(m =>
      m.id === message.id || m.serverMessageId === message.serverMessageId
    );

    if (messageIndex >= 0 && flashListRef.current) {
      setTimeout(() => {
        flashListRef.current.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }

    // Clear highlight after 2 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  }, [chatId]);

  const bottomComposerPadding = 0;
  const listBottomPadding = 12 + 64;

  return {
    chatId,
    currentChat,
    flashListRef,
    handleLoadMore,
    handleSendFiles,
    handleTypingStart,
    handleTypingStop,
    input,
    isKeyboardVisible,
    keyboardOffset,
    listBottomPadding,
    messages,
    onSend,
    openMessageActions,
    closeMessageActions,
    handleReplyAction,
    handleEditAction,
    handleRevokeAction,
    handleDeleteAction,
    handleReactAction,
    handleReactMultiple,
    handleUnreactAction,
    handleForwardAction,
    handleForward,
    selectedActionMessage,
    isMessageActionMenuVisible,
    isForwardModalVisible,
    setIsForwardModalVisible,
    editingMessage,
    handleCancelEdit,
    handleReuseRevokedMessage,
    handleRevokedRestoreExpired,
    handleJumpToReplySource,
    replyingMessage,
    selectedImage,
    selectedImageUrls,
    selectedImageIndex,
    selectedVideo,
    setInput,
    setReplyingMessage,
    setSelectedImage,
    setSelectedImageUrls,
    setSelectedImageIndex,
    setSelectedVideo,
    setShowChatOptions,
    showChatOptions,
    title,
    typingText,
    typingUsers,
    isTypingVisible,
    presence: { ...presenceMap },
    bottomComposerPadding,
    // Search exports
    isSearchMode,
    toggleSearchMode,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearchMessages,
    clearSearch,
    currentSearchIndex,
    navigateSearchResult,
    highlightedMessageId,
    setHighlightedMessageId,
    jumpToMessage,
  };
}







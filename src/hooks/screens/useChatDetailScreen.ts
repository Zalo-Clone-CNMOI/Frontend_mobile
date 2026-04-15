import { useAuth } from '@/src/contexts/AuthContext';
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
} from '@/src/services/chatService';
import { connectSocket } from '@/src/services/socket';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import type { ChatMessage } from '@/src/types/chat';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

const EMPTY_MESSAGES: ChatMessage[] = [];

export function useChatDetailScreenLogic() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const chatId = params?.id || '';
  const { t } = useTranslation();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const isKeyboardVisible = false;

  const keyboardOffset = headerHeight;

  const title = useMemo(() => {
    if (typeof params?.name === 'string' && params.name.trim().length > 0) return params.name;
    return t('chat.default_title');
  }, [params?.name, t]);

  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const flashListRef = useRef<any>(null);
  const loadedCursorRef = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingSocket, setTypingSocket] = useState<Awaited<ReturnType<typeof connectSocket>> | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<ChatMessage | null>(null);
  const [isMessageActionMenuVisible, setIsMessageActionMenuVisible] = useState(false);
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);

  const messages = useMessagesStore((state) => state.messagesByChatId[chatId] || EMPTY_MESSAGES);
  const addMessage = useMessagesStore((state) => state.addMessage);
  const setMessagesForChat = useMessagesStore((state) => state.setMessagesForChat);
  const updateMessage = useMessagesStore((state) => state.updateMessage);
  const deleteMessage = useMessagesStore((state) => state.deleteMessage);
  const revokeMessage = useMessagesStore((state) => state.revokeMessage);
  const addReaction = useMessagesStore((state) => state.addReaction);
  const removeReaction = useMessagesStore((state) => state.removeReaction);
  const updateChat = useChatsStore((state) => state.updateChat);

  const currentChat = useChatsStore((state) => state.chats.find((chat) => chat.conversationId === chatId));
  const { emitTyping, isTypingVisible, typingText, typingUsers } = useTypingIndicator({
    socket: typingSocket,
    conversationId: chatId,
    myUserId: String(user?.id || ''),
    enabled: Boolean(typingSocket && chatId),
  });

  useEffect(() => {
    let active = true;
    loadInitialMessages(chatId)
      .then((res) => {
        if (!active) return;
        setMessagesForChat(chatId, res.messages || []);
        setNextCursor(res.nextCursor || undefined);
        setHasMore(Boolean(res.hasMore));
        setTimeout(() => {
          flashListRef.current?.scrollToEnd({ animated: false });
        }, 50);
      })
      .catch((err) => {
      });
    return () => {
      active = false;
    };
  }, [chatId, setMessagesForChat]);

  const handleLoadMore = useCallback(async () => {
    if (!chatId || !hasMore || !nextCursor || isLoadingMore) return;
    if (loadedCursorRef.current === nextCursor) return;
    loadedCursorRef.current = nextCursor;

    setIsLoadingMore(true);
    try {
      const res = await fetchMoreMessages(chatId, nextCursor, 50);
      const olderMessages = res.messages || [];
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
  }, [chatId, hasMore, isLoadingMore, nextCursor, setMessagesForChat]);

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

          if (existing) {
            updateMessage(chatId, existing.id, {
              text: msg.text ?? existing.text,
              timestamp: msg.timestamp ?? existing.timestamp,
              type: msg.type ?? existing.type,
              fileInfo: msg.fileInfo ?? existing.fileInfo,
              replyTo: msg.replyTo ?? existing.replyTo,
              status: msg.status ?? existing.status,
              isEdited: msg.isEdited ?? existing.isEdited,
              editedAt: msg.editedAt ?? existing.editedAt,
              serverMessageId:
                existing.serverMessageId ||
                msg.serverMessageId ||
                (incomingKey && incomingKey !== existing.id ? incomingKey : undefined),
            });
          } else {
            addMessage(chatId, msg);
            // Update conversation lastMessage
            updateChat(chatId, {
              lastMessage: {
                content: msg.text || '',
                type: msg.type || 'text',
                timestamp: msg.timestamp || Date.now(),
              },
              lastMessageAt: msg.timestamp || Date.now(),
            });
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
    for (const file of files) {
      const fallbackLabel = file?.name || file?.uri?.split('/')?.pop() || 'File';

      try {
        const { optimisticMessage, sendPromise } = await sendSocketMessage(
          chatId,
          fallbackLabel,
          [file],
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
    console.log('[handleForwardAction] Opening forward modal for message:', msg.id);
    setSelectedActionMessage(msg);
    // Use setTimeout to ensure state update is processed before opening modal
    setTimeout(() => {
      setIsForwardModalVisible(true);
    }, 0);
  }, []);

  const handleForward = useCallback(async (message: ChatMessage, targetConversationId: string) => {
    console.log('[handleForward] Called with targetConversationId:', targetConversationId);
    console.log('[handleForward] message:', message);
    if (!message) {
      console.error('[handleForward] No message provided');
      return;
    }
    console.log('[handleForward] Forwarding message to conversation:', targetConversationId);
    try {
      await forwardMessage(message, targetConversationId);
      console.log('[handleForward] Forward successful');
      Alert.alert(t('chat.forward_success', { defaultValue: 'Đã chuyển tiếp tin nhắn' }));
    } catch (error) {
      console.error('[handleForward] Forward failed:', error);
      Alert.alert(t('chat.forward_failed', { defaultValue: 'Chuyển tiếp thất bại' }), String(error));
    }
  }, [t]);

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
      await reactMessage(chatId, msg.serverMessageId || msg.id, reaction);
    } catch (error) {
    }
    closeMessageActions();
  }, [chatId, closeMessageActions]);

  const handleUnreactAction = useCallback(async (messageId: string, reactionType: string) => {
    try {
      await unreactMessage(chatId, messageId);
    } catch (error) {
    }
  }, [chatId]);

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
        // Update conversation lastMessage when editing
        updateChat(chatId, {
          lastMessage: {
            content: trimmed,
            type: editingMessage.type || 'text',
            timestamp: Date.now(),
          },
          lastMessageAt: Date.now(),
        });
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
      // Update conversation lastMessage when sending new message
      updateChat(chatId, {
        lastMessage: {
          content: trimmed,
          type: optimisticMessage.type || 'text',
          timestamp: Date.now(),
        },
        lastMessageAt: Date.now(),
      });
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
    emitTyping(user?.name || user?.phone || user?.id || 'User');
  }, [chatId, emitTyping, user?.id, user?.name, user?.phone]);

  const handleTypingStop = useCallback(() => undefined, []);

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
    selectedVideo,
    setInput,
    setReplyingMessage,
    setSelectedImage,
    setSelectedVideo,
    setShowChatOptions,
    showChatOptions,
    title,
    typingText,
    typingUsers,
    isTypingVisible,
    bottomComposerPadding,
  };
}







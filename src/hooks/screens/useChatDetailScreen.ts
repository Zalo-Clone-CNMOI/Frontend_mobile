import { fetchMoreMessages, loadInitialMessages, registerHandlers, sendMessage as sendSocketMessage } from '@/src/services/chatService';
import { connectSocket, getSocket } from '@/src/services/socket';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import type { ChatMessage } from '@/src/types/chat';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

export function useChatDetailScreenLogic() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const chatId = params?.id || '';
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const isKeyboardVisible = false;

  const keyboardOffset = headerHeight;

  const title = useMemo(() => {
    if (typeof params?.name === 'string' && params.name.trim().length > 0) return params.name;
    return t('chat.default_title');
  }, [params?.name, t]);

  const [input, setInput] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const flashListRef = useRef<any>(null);
  const loadedCursorRef = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesByChatId = useMessagesStore((state) => state.messagesByChatId);
  const messages = messagesByChatId[chatId] || [];
  const addMessage = useMessagesStore((state) => state.addMessage);
  const setMessagesForChat = useMessagesStore((state) => state.setMessagesForChat);
  const updateMessage = useMessagesStore((state) => state.updateMessage);
  const deleteMessage = useMessagesStore((state) => state.deleteMessage);
  const revokeMessage = useMessagesStore((state) => state.revokeMessage);

  const chats = useChatsStore((state) => state.chats);
  const currentChat = useMemo(() => chats.find((chat) => chat.conversationId === chatId), [chats, chatId]);

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
        console.error('Failed to load initial messages:', err);
      });
    return () => {
      active = false;
    };
  }, [chatId, setMessagesForChat]);

  const upsertReaction = useCallback((messageId: string, reactionType: string, userId: string, mode: 'add' | 'remove') => {
    const currentMessages = useMessagesStore.getState().messagesByChatId[chatId] || [];
    const target = currentMessages.find((m) => m.id === messageId);
    if (!target) return;

    const reactions = { ...(target.reactions || {}) };
    const key = reactionType || 'like';
    const users = Array.isArray(reactions[key]) ? [...reactions[key]] : [];
    const hasUser = users.includes(userId);

    if (mode === 'add' && !hasUser) users.push(userId);
    if (mode === 'remove' && hasUser) {
      const idx = users.indexOf(userId);
      users.splice(idx, 1);
    }

    if (users.length === 0) delete reactions[key];
    else reactions[key] = users;

    updateMessage(chatId, messageId, { reactions });
  }, [chatId, updateMessage]);

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
      console.error('Failed to load more messages:', error);
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
              serverMessageId:
                existing.serverMessageId ||
                msg.serverMessageId ||
                (incomingKey && incomingKey !== existing.id ? incomingKey : undefined),
            });
          } else {
            addMessage(chatId, msg);
          }

          const activeSocket = getSocket();
          if (activeSocket) activeSocket.emit('chat:read', { conversation_id: chatId });
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
            const oldTs = Number(match.timestamp || 0);
            const nextTs = Number(msg.timestamp || 0);
            if (oldText === nextText && oldTs === nextTs) return;
            updateMessage(chatId, match.id, { text: msg.text, timestamp: msg.timestamp });
          }
        }
      },
      onMessageDeleted: (info: any) => {
        if (info.conversationId === chatId) {
          deleteMessage(chatId, info.messageId);
        }
      },
      onReactionAdded: (info: any) => {
        if (info.conversationId === chatId) {
          upsertReaction(info.messageId, info.reactionType, info.userId, 'add');
        }
      },
      onReactionRemoved: (info: any) => {
        if (info.conversationId === chatId) {
          upsertReaction(info.messageId, info.reactionType, info.userId, 'remove');
        }
      },
    };

    registerHandlers(handlers);

    const handleTyping = (data: any) => {
      if (data.conversation_id === chatId && data.user_id) {
        if (data.is_typing) {
          setTypingUsers((prev) => {
            if (prev.includes(data.user_id)) return prev;
            return [...prev, data.user_id];
          });
        } else {
          setTypingUsers((prev) => {
            if (!prev.includes(data.user_id)) return prev;
            return prev.filter((id) => id !== data.user_id);
          });
        }
      }
    };

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
    let connectedSocket: ReturnType<typeof getSocket> = null;

    const bindSocket = async () => {
      connectedSocket = await connectSocket();
      if (!active || !connectedSocket) return;

      connectedSocket.emit('chat:read', { conversation_id: chatId });
      connectedSocket.on('chat:typing', handleTyping);
      connectedSocket.on('chat:read', handleRead);
    };

    bindSocket();

    return () => {
      active = false;
      registerHandlers({});
      if (connectedSocket) {
        connectedSocket.off('chat:typing', handleTyping);
        connectedSocket.off('chat:read', handleRead);
      }
    };
  }, [addMessage, chatId, deleteMessage, updateMessage, upsertReaction]);

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
        console.error('Failed to send file message:', error);
        if ((error as any)?.message_id) {
          updateMessage(chatId, (error as any).message_id, { status: 'failed' });
        }
      }
    }

    setReplyingMessage(null);
    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [addMessage, chatId, replyingMessage, updateMessage]);

  const openMessageActions = useCallback((msg: ChatMessage) => {
    const actions: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: t('chat.reply_to'),
        onPress: () => {
          if (msg.isRevoked) return;
          setReplyingMessage(msg);
        },
      },
      {
        text: t('chat.revoke'),
        style: 'destructive',
        onPress: () => {
          revokeMessage(chatId, msg.id);
          if (replyingMessage?.id === msg.id) setReplyingMessage(null);
        },
      },
      {
        text: t('chat.cancel'),
        style: 'cancel',
      },
    ];

    Alert.alert(t('chat.actions'), undefined, actions);
  }, [chatId, replyingMessage?.id, revokeMessage, t]);

  const handleReuseRevokedMessage = useCallback((msg: ChatMessage) => {
    const restoredText = String(msg.revokedBackupText || msg.text || '').trim();
    if (!restoredText) return;
    setReplyingMessage(null);
    setInput(restoredText);
  }, []);

  const onSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      const { optimisticMessage, sendPromise } = await sendSocketMessage(
        chatId,
        trimmed,
        undefined,
        { replyToMessage: replyingMessage },
      );
      addMessage(chatId, optimisticMessage);
      await sendPromise;
      updateMessage(chatId, optimisticMessage.id, { status: 'sent' });
      setInput('');
      setReplyingMessage(null);
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      if ((error as any)?.message_id) {
        updateMessage(chatId, (error as any).message_id, { status: 'failed' });
      }
    }
  }, [addMessage, chatId, input, replyingMessage, updateMessage]);

  const handleTypingStart = useCallback(() => {
    const activeSocket = getSocket();
    if (activeSocket && chatId) activeSocket.emit('chat:typing', { conversation_id: chatId, is_typing: true });
  }, [chatId]);

  const handleTypingStop = useCallback(() => {
    const activeSocket = getSocket();
    if (activeSocket && chatId) activeSocket.emit('chat:typing', { conversation_id: chatId, is_typing: false });
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
    handleReuseRevokedMessage,
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
    typingUsers,
    bottomComposerPadding,
  };
}

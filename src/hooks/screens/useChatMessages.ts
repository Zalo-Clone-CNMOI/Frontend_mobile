import { useCallback, useEffect, useRef, useState } from 'react';
import { loadInitialMessages, fetchMoreMessages } from '@/src/services/chatService';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import type { ChatMessage } from '@/src/types/chat';

const EMPTY_MESSAGES: ChatMessage[] = [];

interface UseChatMessagesOptions {
  chatId: string;
  currentChatAvatar?: string | null;
  currentChatName?: string | null;
  jumpToMessageId?: string;
}

export function useChatMessages({
  chatId,
  currentChatAvatar,
  currentChatName,
  jumpToMessageId,
}: UseChatMessagesOptions) {
  // Store selectors
  const messages = useMessagesStore((state) => state.messagesByChatId[chatId] || EMPTY_MESSAGES);
  const setMessagesForChat = useMessagesStore((state) => state.setMessagesForChat);
  const updateMessage = useMessagesStore((state) => state.updateMessage);

  // Local state
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Refs
  const flashListRef = useRef<any>(null);
  const loadedCursorRef = useRef<string | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Initial load
  useEffect(() => {
    if (!chatId) return;

    let active = true;

    loadInitialMessages(chatId)
      .then((res) => {
        if (!active) return;

        const msgs = (res.messages || []).map((msg) => ({
          ...msg,
          senderAvatar: currentChatAvatar || null,
          senderName: currentChatName || msg.senderName,
        }));

        setMessagesForChat(chatId, msgs);
        setNextCursor(res.nextCursor || undefined);
        setHasMore(Boolean(res.hasMore));

        // Handle jump to message
        if (jumpToMessageId) {
          const targetIndex = msgs.findIndex((m) => m.id === jumpToMessageId);
          if (targetIndex >= 0) {
            const timeout1 = setTimeout(() => {
              flashListRef.current?.scrollToIndex({
                index: targetIndex,
                animated: false,
                viewPosition: 0.5,
              });
              setHighlightedMessageId(jumpToMessageId);
              const timeout2 = setTimeout(() => setHighlightedMessageId(null), 2000);
              timeoutRefs.current.push(timeout2);
            }, 100);
            timeoutRefs.current.push(timeout1);
          } else {
            const timeout3 = setTimeout(() => {
              flashListRef.current?.scrollToEnd({ animated: false });
            }, 50);
            timeoutRefs.current.push(timeout3);
          }
        } else {
          const timeout4 = setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: false });
          }, 50);
          timeoutRefs.current.push(timeout4);
        }
      })
      .catch((err) => {
        console.error('[useChatMessages] Error loading messages:', err);
      });

    return () => {
      active = false;
      // Clear all pending timeouts to prevent memory leaks
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current = [];
    };
  }, [chatId, currentChatAvatar, currentChatName, jumpToMessageId, setMessagesForChat]);

  // Load more (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!chatId || !hasMore || !nextCursor || isLoadingMore) return;
    if (loadedCursorRef.current === nextCursor) return;

    setIsLoadingMore(true);

    try {
      const res = await fetchMoreMessages(chatId, nextCursor, 50);

      const olderMessages = (res.messages || []).map((msg) => ({
        ...msg,
        senderAvatar: currentChatAvatar || null,
        senderName: currentChatName || msg.senderName,
      }));

      // Merge with existing messages
      setMessagesForChat(chatId, (existingMessages) => {
        const current = existingMessages || [];
        const mergedMap = new Map<string, ChatMessage>();
        [...olderMessages, ...current].forEach((m) => mergedMap.set(m.id, m));
        return Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      });

      setNextCursor(res.nextCursor || undefined);
      setHasMore(Boolean(res.hasMore));
    } catch (error) {
      loadedCursorRef.current = null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore, isLoadingMore, nextCursor, currentChatAvatar, currentChatName, setMessagesForChat]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((animated = true) => {
    flashListRef.current?.scrollToEnd({ animated });
  }, []);

  return {
    // Data
    messages,

    // Pagination
    hasMore,
    isLoadingMore,
    handleLoadMore,

    // UI state
    highlightedMessageId,
    setHighlightedMessageId,

    // Refs
    flashListRef,

    // Actions
    scrollToBottom,
    setMessagesForChat,
    updateMessage,
  };
}

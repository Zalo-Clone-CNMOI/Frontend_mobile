/**
 * Typing Indicator Hook
 * Emits chat:typing with 1s throttle
 * Handles chat:typing:update from server
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { WsEvents, type TypingUpdatePayload } from './events';

const TYPING_THROTTLE_MS = 1_000; // 1 second

interface UseTypingParams {
  socket: Socket | null;
  conversationId: string;
  currentUserId: string;
  currentUsername: string;
}

// Support both snake_case (Backend) and camelCase (Frontend_web compatibility)
interface TypingUser {
  user_id?: string;
  userId?: string;
  username?: string;
  fullName?: string;
  name?: string;
}

const resolveUserId = (user: TypingUser): string => user.userId || user.user_id || '';
const resolveUsername = (user: TypingUser): string => user.fullName || user.username || user.name || 'Ai đó';

export function useTyping({
  socket,
  conversationId,
  currentUserId,
  currentUsername,
}: UseTypingParams) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastTypingEmitRef = useRef(0);

  const emitTyping = useCallback(() => {
    if (!socket) {
      console.log('[useTyping] Socket not available');
      return;
    }
    if (!socket.connected) {
      console.log('[useTyping] Socket not connected');
      return;
    }

    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) {
      console.log('[useTyping] Throttled');
      return;
    }

    lastTypingEmitRef.current = now;
    console.log('[useTyping] Emitting chat:typing', { conversationId, currentUsername });
    socket.emit("chat:typing", {
      conversation_id: conversationId,
      username: currentUsername,
    });
  }, [socket, conversationId, currentUsername]);

  useEffect(() => {
    if (!socket) {
      console.log('[useTyping] No socket provided');
      return;
    }
    console.log('[useTyping] Subscribing to chat:typing:update, socket connected:', socket.connected);

    const handleTypingUpdate = (payload: TypingUpdatePayload) => {
      console.log('[useTyping] Received chat:typing:update', payload);
      console.log('[useTyping] Current conversationId:', conversationId);
      console.log('[useTyping] Current userId:', currentUserId);
      
      if (payload.conversation_id !== conversationId) {
        console.log('[useTyping] Wrong conversation, expected:', conversationId, 'got:', payload.conversation_id);
        return;
      }

      console.log('[useTyping] Users before filter:', payload.users);

      // Filter out current user (don't show "You are typing...")
      const withoutSelf = payload.users.filter(
        (u) => resolveUserId(u) !== currentUserId
      );

      console.log('[useTyping] Users after filter:', withoutSelf);

      // Deduplicate by user_id
      const deduped = Array.from(
        new Map(withoutSelf.map((u) => [resolveUserId(u), u])).values()
      );

      console.log('[useTyping] Final typing users:', deduped);
      setTypingUsers(deduped);
    };

    socket.on("chat:typing:update", handleTypingUpdate);

    return () => {
      socket.off("chat:typing:update", handleTypingUpdate);
      setTypingUsers([]);
    };
  }, [socket, conversationId, currentUserId]);

  const typingText = useMemo(() => {
    console.log('[useTyping] Calculating typingText, typingUsers:', typingUsers);
    if (typingUsers.length === 0) {
      console.log('[useTyping] No typing users, returning empty string');
      return '';
    }
    if (typingUsers.length === 1) {
      const text = `${resolveUsername(typingUsers[0])} đang nhập...`;
      console.log('[useTyping] Single user typing:', text);
      return text;
    }
    if (typingUsers.length === 2) {
      const text = `${resolveUsername(typingUsers[0])} và ${resolveUsername(typingUsers[1])} đang nhập...`;
      console.log('[useTyping] Two users typing:', text);
      return text;
    }
    const text = `${typingUsers.length} người đang nhập...`;
    console.log('[useTyping] Multiple users typing:', text);
    return text;
  }, [typingUsers]);

  return {
    emitTyping,
    typingUsers,
    typingText,
    isTypingVisible: typingUsers.length > 0,
  };
}

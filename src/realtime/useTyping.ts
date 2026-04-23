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
      return;
    }
    if (!socket.connected) {
      return;
    }

    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) {
      return;
    }

    lastTypingEmitRef.current = now;
    socket.emit("chat:typing", {
      conversation_id: conversationId,
      username: currentUsername,
    });
  }, [socket, conversationId, currentUsername]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleTypingUpdate = (payload: TypingUpdatePayload) => {
      if (payload.conversation_id !== conversationId) {
        return;
      }

      // Filter out current user (don't show "You are typing...")
      const withoutSelf = payload.users.filter(
        (u) => resolveUserId(u) !== currentUserId
      );

      // Deduplicate by user_id
      const deduped = Array.from(
        new Map(withoutSelf.map((u) => [resolveUserId(u), u])).values()
      );
      setTypingUsers(deduped);
    };

    socket.on("chat:typing:update", handleTypingUpdate);

    return () => {
      socket.off("chat:typing:update", handleTypingUpdate);
      setTypingUsers([]);
    };
  }, [socket, conversationId, currentUserId]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) {
      return '';
    }
    if (typingUsers.length === 1) {
      const text = `${resolveUsername(typingUsers[0])} đang nhập...`;
      return text;
    }
    if (typingUsers.length === 2) {
      const text = `${resolveUsername(typingUsers[0])} và ${resolveUsername(typingUsers[1])} đang nhập...`;
      return text;
    }
    const text = `${typingUsers.length} người đang nhập...`;
    return text;
  }, [typingUsers]);

  return {
    emitTyping,
    typingUsers,
    typingText,
    isTypingVisible: typingUsers.length > 0,
  };
}

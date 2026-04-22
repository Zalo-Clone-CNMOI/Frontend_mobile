import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { ChatTypingUpdatePayload, TypingIndicatorState } from "../types/realtimeBff";
import { createTypingIndicatorService, formatTypingIndicator } from "../services/realtime/typingIndicatorService";
import { useChatStore } from "../store/chatStore";

type UseTypingIndicatorOptions = {
  socket: Socket | null;
  conversationId: string;
  myUserId: string;
  enabled?: boolean;
  throttleMs?: number;
};

export const useTypingIndicator = ({
  socket,
  conversationId,
  myUserId,
  enabled = true,
  throttleMs = 1000,
}: UseTypingIndicatorOptions) => {
  const service = useMemo(
    () =>
      socket
        ? createTypingIndicatorService({
            socket,
            throttleMs,
          })
        : null,
    [socket, throttleMs],
  );
  
  // Use local state to avoid infinite loop with chatStore updates
  const [state, setState] = useState<TypingIndicatorState>({
    users: [],
    text: "",
    visible: false,
  });
  const latestPayloadRef = useRef<ChatTypingUpdatePayload | null>(null);

  useEffect(() => {
    console.log('[useTypingIndicator] Effect triggered', {
      enabled,
      hasService: !!service,
      conversationId,
      myUserId
    });
    
    if (!enabled || !service) {
      console.log('[useTypingIndicator] Early return - enabled:', enabled, 'hasService:', !!service);
      return;
    }

    const unsubscribe = service.subscribe((payload) => {
      console.log('[useTypingIndicator] Received payload:', payload);
      
      if (payload.conversation_id !== conversationId) {
        console.log('[useTypingIndicator] Wrong conversation, expected:', conversationId, 'got:', payload.conversation_id);
        return;
      }

      console.log('[useTypingIndicator] Updating local state with users:', payload.users);
      latestPayloadRef.current = payload;
      // Update local state directly to avoid infinite loop
      setState(formatTypingIndicator(payload.users || [], myUserId));
      
      // Also update chatStore for backward compatibility (without causing re-render)
      const transformedPayload = {
        conversation_id: payload.conversation_id,
        users: (payload.users || []).map(u => ({
          user_id: u.userId || u.user_id || '',
          username: u.username || u.fullName || u.name || '',
        })).filter(u => u.user_id),
      };
      useChatStore.getState().updateTypingUsers(transformedPayload);
    });

    console.log('[useTypingIndicator] Subscription set up');
    return unsubscribe;
  }, [conversationId, enabled, myUserId, service]);

  return {
    typingUsers: state.users,
    typingText: state.text,
    isTypingVisible: state.visible,
    latestTypingPayload: latestPayloadRef.current,
    emitTyping: (username: string) =>
      service?.emitTyping({
        conversation_id: conversationId,
        username,
      }) || false,
  };
};

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
    if (!enabled || !service) {
      return;
    }

    const unsubscribe = service.subscribe((payload) => {
      if (payload.conversation_id !== conversationId) {
        return;
      }
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

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { ChatTypingUpdatePayload, TypingIndicatorState } from "../types/realtimeBff";
import { createTypingIndicatorService, formatTypingIndicator } from "../services/realtime/typingIndicatorService";

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
  const [state, setState] = useState<TypingIndicatorState>({
    users: [],
    text: "",
    visible: false,
  });
  const latestPayloadRef = useRef<ChatTypingUpdatePayload | null>(null);

  useEffect(() => {
    if (!enabled || !service) return;

    const unsubscribe = service.subscribe((payload) => {
      if (payload.conversation_id !== conversationId) {
        return;
      }

      latestPayloadRef.current = payload;
      setState(formatTypingIndicator(payload.users || [], myUserId));
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

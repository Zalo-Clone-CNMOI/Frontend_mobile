import { Socket } from "socket.io-client";
import {
  ChatTypingEmitPayload,
  ChatTypingUpdatePayload,
  ChatTypingUser,
  TypingIndicatorState,
} from "../../types/realtimeBff";

type CreateTypingIndicatorServiceOptions = {
  socket: Socket;
  throttleMs?: number;
};

const resolveTypingUserId = (user: ChatTypingUser) => user.userId || user.user_id;

export const formatTypingIndicator = (
  users: ChatTypingUser[],
  myUserId: string,
): TypingIndicatorState => {
  const filteredUsers = users.filter((user) => resolveTypingUserId(user) !== myUserId);

  if (filteredUsers.length === 0) {
    return {
      users: [],
      text: "",
      visible: false,
    };
  }

  if (filteredUsers.length === 1) {
    const user = filteredUsers[0];
    const displayName =
      user.fullName || user.username || user.name || "Ai đó";
    return {
      users: filteredUsers,
      text: `${displayName} đang nhập...`,
      visible: true,
    };
  }

  return {
    users: filteredUsers,
    text: `${filteredUsers.length} người đang nhập...`,
    visible: true,
  };
};

export const createTypingIndicatorService = ({
  socket,
  throttleMs = 1000,
}: CreateTypingIndicatorServiceOptions) => {
  
  const lastEmittedAt = new Map<string, number>();

  const emitTyping = (payload: ChatTypingEmitPayload) => {
    const now = Date.now();
    const lastSentAt = lastEmittedAt.get(payload.conversation_id) || 0;
    if (now - lastSentAt < throttleMs) {
      return false;
    }

    lastEmittedAt.set(payload.conversation_id, now);
    socket.emit("chat:typing", payload);
    return true;
  };

  const subscribe = (
    handler: (payload: ChatTypingUpdatePayload) => void,
  ) => {
    const handleTypingUpdate = (payload: ChatTypingUpdatePayload) => {
      handler(payload);
    };
    
    socket.on("chat:typing:update", handleTypingUpdate);
    return () => {
      socket.off("chat:typing:update", handleTypingUpdate);
    };
  };

  return {
    emitTyping,
    subscribe,
  };
};

export type TypingIndicatorService = ReturnType<
  typeof createTypingIndicatorService
>;

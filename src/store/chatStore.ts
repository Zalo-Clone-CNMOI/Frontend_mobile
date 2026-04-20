import { create } from 'zustand';
import type {
    SocketChatMessageDeletedEvent,
    SocketChatMessageEvent,
    SocketChatMessageUpdatedEvent,
    SocketChatReactionAddedEvent,
    SocketChatReactionRemovedEvent,
    SocketChatTypingUpdateEvent,
} from '../types/dto/SocketDTO';

export interface ForwardedFrom {
  source_message_id: string;
  source_conversation_id: string;
  source_sender_id: string;
  source_sender_name_snapshot: string;
  source_created_at: number;
  source_type: 'text' | 'image' | 'file' | 'mixed';
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: number;
  attachments?: any[];
  reply_to_message_id?: string;
  forwarded_from?: ForwardedFrom;  // ✅ Thêm forwarded_from
  edited_at?: number;
  deleted_at?: number;
  reactions?: Reaction[];
}

export interface Reaction {
  user_id: string;
  reaction_type: string;
}

export interface TypingUser {
  user_id: string;
  username: string;
}

export interface Presence {
  user_id: string;
  status: 'online' | 'offline';
  last_seen_at: number;
  expires_at: number;
}

interface ChatState {
  messages: Record<string, Message[]>; // conversation_id -> messages
  typingUsers: Record<string, TypingUser[]>; // conversation_id -> users
  presence: Record<string, Presence>; // user_id -> presence

  addMessage: (payload: SocketChatMessageEvent) => void;
  updateMessage: (payload: SocketChatMessageUpdatedEvent) => void;
  deleteMessage: (payload: SocketChatMessageDeletedEvent) => void;
  addReaction: (payload: SocketChatReactionAddedEvent) => void;
  removeReaction: (payload: SocketChatReactionRemovedEvent) => void;
  updateTypingUsers: (payload: SocketChatTypingUpdateEvent) => void;
  updatePresence: (userId: string, status: 'online' | 'offline', lastSeenAt: number, expiresAt: number) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  typingUsers: {},
  presence: {},

  addMessage: (payload) => set((state) => {
    const conversationId = payload.conversation_id || '';
    const messageId = payload.message_id || payload.id || '';

    if (!conversationId || !messageId) return state;

    const newMessage: Message = {
      message_id: messageId,
      conversation_id: conversationId,
      sender_id: payload.sender_id || '',
      body: payload.body || '',
      created_at: typeof payload.created_at === 'number' ? payload.created_at :
                     typeof payload.createdAt === 'number' ? payload.createdAt :
                     typeof payload.ts === 'number' ? payload.ts :
                     typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
      attachments: payload.attachments,
      reply_to_message_id: payload.reply_to_message_id,
      forwarded_from: payload.forwarded_from,  // ✅ Lưu forwarded_from từ socket
    };


    const existingMessages = state.messages[conversationId] || [];
    
    // Check if message already exists (deduplication)
    const messageExists = existingMessages.some(m => m.message_id === messageId);
    
    if (messageExists) {
      return state;
    }

    return {
      messages: {
        ...state.messages,
        [conversationId]: [...existingMessages, newMessage],
      },
    };
  }),

  updateMessage: (payload) => set((state) => {
    const conversationId = payload.conversation_id || '';
    const messageId = payload.message_id || '';
    const newBody = payload.body || '';
    const editedAt = typeof payload.edited_at === 'number' ? payload.edited_at :
                     typeof payload.edited_at === 'string' ? parseInt(payload.edited_at) : undefined;

    if (!conversationId || !messageId) return state;

    return {
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.map(msg =>
          msg.message_id === messageId
            ? { ...msg, body: newBody, edited_at: editedAt }
            : msg
        ) || [],
      },
    };
  }),

  deleteMessage: (payload) => set((state) => {
    const conversationId = payload.conversation_id || '';
    const messageId = payload.message_id || '';

    if (!conversationId || !messageId) return state;

    return {
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.filter(msg =>
          msg.message_id !== messageId
        ) || [],
      },
    };
  }),

  addReaction: (payload) => set((state) => {
    const conversationId = payload.conversation_id || '';
    const messageId = payload.message_id || '';
    const userId = payload.user_id || '';
    const reactionType = payload.reaction_type || '';

    if (!conversationId || !messageId || !userId || !reactionType) return state;

    return {
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.map(msg =>
          msg.message_id === messageId
            ? {
                ...msg,
                reactions: [
                  ...(msg.reactions || []),
                  { user_id: userId, reaction_type: reactionType },
                ],
              }
            : msg
        ) || [],
      },
    };
  }),

  removeReaction: (payload) => set((state) => {
    const conversationId = payload.conversation_id || '';
    const messageId = payload.message_id || '';
    const userId = payload.user_id || '';

    if (!conversationId || !messageId || !userId) return state;

    return {
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.map(msg =>
          msg.message_id === messageId
            ? {
                ...msg,
                reactions: msg.reactions?.filter(r => r.user_id !== userId),
              }
            : msg
        ) || [],
      },
    };
  }),

  updateTypingUsers: (payload) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [payload.conversation_id]: payload.users,
    },
  })),

  updatePresence: (userId, status, lastSeenAt, expiresAt) => set((state) => ({
    presence: {
      ...state.presence,
      [userId]: {
        user_id: userId,
        status,
        last_seen_at: lastSeenAt,
        expires_at: expiresAt,
      },
    },
  })),

  reset: () => ({
    messages: {},
    typingUsers: {},
    presence: {},
  }),
}));

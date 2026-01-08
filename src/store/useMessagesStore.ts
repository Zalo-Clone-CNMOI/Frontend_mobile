import { create } from 'zustand';
import { USERS_V2 } from '../data/contactsMockData';
import { MESSAGES_V2 } from '../data/messagesMockData';
import { ChatMessage } from '../types/chat';

interface MessagesState {
  // State: Map of chatId -> messages
  messagesByChatId: Record<string, ChatMessage[]>;

  // Actions
  initializeMessages: () => void;
  getMessagesByChatId: (chatId: string) => ChatMessage[];
  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  revokeMessage: (chatId: string, messageId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  // State
  messagesByChatId: {},

  // Actions
  initializeMessages: () => {
    // Prefer v2 messages and map them into the ChatMessage shape expected by
    // the existing UI/store. Group messages by conversationId.
    if (MESSAGES_V2 && MESSAGES_V2.length) {
      const byChat: Record<string, ChatMessage[]> = {};
      const msgIndex: Record<string, any> = {};
      MESSAGES_V2.forEach((m) => (msgIndex[m.id] = m));

      MESSAGES_V2.forEach((m) => {
        const senderId = m.senderId;
        const fromMe = senderId === 'user-me';
        const chatMsg: ChatMessage = {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          fromMe,
          type: m.type as any,
          text: m.type === 'text' ? m.content : undefined,
          fileInfo: m.type === 'image' || m.type === 'file' ? { uri: m.content } : undefined,
          timestamp: m.createdAt,
          replyTo: m.replyTo
            ? (() => {
                const orig = msgIndex[m.replyTo];
                if (!orig) return undefined;
                const sender = USERS_V2.find((u) => u.id === orig.senderId);
                return {
                  id: orig.id,
                  senderId: orig.senderId,
                  senderName: sender ? sender.fullName : orig.senderId,
                  text: orig.content || '',
                };
              })()
            : undefined,
          reactions: m.reactions,
          deletedFor: m.deletedFor,
          isRevoked: !!m.revoked,
        };

        byChat[m.conversationId] = byChat[m.conversationId] || [];
        byChat[m.conversationId].push(chatMsg);
      });

      set({ messagesByChatId: byChat });
      return;
    }

    // Fallback: no legacy per-chat map available, initialize empty map
    set({ messagesByChatId: {} });
  },

  getMessagesByChatId: (chatId: string) => {
    const state = get();
    return state.messagesByChatId[chatId] || [];
  },

  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => {
    set((state) => {
      // Preserve provided id if caller supplied one (e.g., batch file send),
      // otherwise generate a stable-unique id using timestamp + random suffix.
      const providedId = (message as any).id;
      const newId = providedId ? String(providedId) : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const newMessage: ChatMessage = {
        ...message,
        id: newId,
      };

      const chatMessages = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: [...chatMessages, newMessage],
        },
      };
    });
  },

  addMessage: (chatId: string, message: ChatMessage) => {
    set((state) => {
      const chatMessages = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: [...chatMessages, message],
        },
      };
    });
  },

  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => {
    set((state) => {
      const chatMessages = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: chatMessages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      };
    });
  },

  deleteMessage: (chatId: string, messageId: string) => {
    set((state) => {
      const chatMessages = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: chatMessages.filter((m) => m.id !== messageId),
        },
      };
    });
  },

  revokeMessage: (chatId: string, messageId: string) => {
    set((state) => {
      const chatMessages = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: chatMessages.map((m) =>
            m.id === messageId ? { ...m, isRevoked: true } : m
          ),
        },
      };
    });
  },
}));

import { create } from 'zustand';
import { fetchAllMessages } from '../services/chatService';
import { ChatMessage } from '../types/chat';

interface MessagesState {
  // Map of conversation_id → messages
  messagesByChatId: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;

  initializeMessages: () => Promise<void>;
  getMessagesByChatId: (chatId: string) => ChatMessage[];
  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  revokeMessage: (chatId: string, messageId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messagesByChatId: {},
  isLoading: false,
  error: null,

  /**
   * Load tất cả messages từ mock API (chatService).
   * Sau này thay chatService bằng fetch thật là xong.
   */
  initializeMessages: async () => {
    set({ isLoading: true, error: null });
    try {
      const byChat = await fetchAllMessages();
      set({ messagesByChatId: byChat, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  getMessagesByChatId: (chatId) => {
    return get().messagesByChatId[chatId] || [];
  },

  sendMessage: (chatId, message) => {
    set((state) => {
      const providedId = (message as any).id;
      const newId = providedId
        ? String(providedId)
        : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const newMessage: ChatMessage = { ...message, id: newId };
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: [...existing, newMessage],
        },
      };
    });
  },

  addMessage: (chatId, message) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: [...existing, message],
        },
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        },
      };
    });
  },

  deleteMessage: (chatId, messageId) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.filter((m) => m.id !== messageId),
        },
      };
    });
  },

  revokeMessage: (chatId, messageId) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) =>
            m.id === messageId ? { ...m, isRevoked: true } : m
          ),
        },
      };
    });
  },
}));

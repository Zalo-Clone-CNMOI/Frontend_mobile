import { create } from 'zustand';
import { ChatMessage } from '../types/chat';
import { MESSAGES_INITIAL_DATA, MESSAGES_BY_CHAT_ID } from '../data/messagesMockData';

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
    set({
      messagesByChatId: MESSAGES_BY_CHAT_ID,
    });
  },

  getMessagesByChatId: (chatId: string) => {
    const state = get();
    return state.messagesByChatId[chatId] || [];
  },

  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => {
    set((state) => {
      const newMessage: ChatMessage = {
        ...message,
        id: String(Date.now()),
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

import { create } from 'zustand';
import { fetchConversations } from '../services/chatService';
import { ConversationV2 } from '../types/chat';

interface ChatsState {
  chats: ConversationV2[];
  filteredChats: ConversationV2[];
  searchQuery: string;
  filterTab: 'priority' | 'other';
  isLoading: boolean;
  error: string | null;

  initializeChats: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: 'priority' | 'other') => void;
  addChat: (chat: ConversationV2) => void;
  deleteChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ConversationV2>) => void;
  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string) => void;
  reset: () => void;
}

export const useChatsStore = create<ChatsState>((set) => ({
  chats: [],
  filteredChats: [],
  searchQuery: '',
  filterTab: 'priority',
  isLoading: false,
  error: null,

  initializeChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await fetchConversations();
      set({ chats: conversations, filteredChats: conversations, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();
      const filtered = trimmedQuery
        ? state.chats.filter((chat) =>
            (chat.name || '').toLowerCase().includes(trimmedQuery) ||
            (chat.lastMessage?.content || '').toLowerCase().includes(trimmedQuery)
          )
        : state.chats;

      return {
        searchQuery: query,
        filteredChats: filtered,
      };
    });
  },

  setFilterTab: (tab: 'priority' | 'other') => {
    set({ filterTab: tab });
  },

  addChat: (chat: ConversationV2) => {
    set((state) => ({
      chats: [chat, ...state.chats],
      filteredChats: [chat, ...state.filteredChats],
    }));
  },

  deleteChat: (chatId: string) => {
    set((state) => {
      const updatedChats = state.chats.filter((c) => c.conversationId !== chatId);
      return {
        chats: updatedChats,
        filteredChats: updatedChats,
      };
    });
  },

  updateChat: (chatId: string, updates: Partial<ConversationV2>) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.conversationId === chatId ? { ...c, ...updates } : c)),
      filteredChats: state.filteredChats.map((c) =>
        c.conversationId === chatId ? { ...c, ...updates } : c
      ),
    }));
  },

  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string) => {
    set((state) => {
      const updateConversation = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          return {
            ...chat,
            lastMessage: {
              content,
              type: type as any,
              timestamp,
              senderId,
              senderName,
            },
            lastMessageAt: timestamp,
          };
        }
        return chat;
      };

      return {
        chats: state.chats.map(updateConversation),
        filteredChats: state.filteredChats.map(updateConversation),
      };
    });
  },

  reset: () => {
    set({
      chats: [],
      filteredChats: [],
      searchQuery: '',
      filterTab: 'priority',
      isLoading: false,
      error: null,
    });
  },
}));

import { create } from 'zustand';
import { ChatPreview } from '../types/chat';
import { CHATS_MOCK_DATA } from '../data/chatsMockData';

interface ChatsState {
  // State
  chats: ChatPreview[];
  filteredChats: ChatPreview[];
  searchQuery: string;
  filterTab: 'priority' | 'other';

  // Actions
  initializeChats: () => void;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: 'priority' | 'other') => void;
  addChat: (chat: ChatPreview) => void;
  deleteChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ChatPreview>) => void;
}

export const useChatsStore = create<ChatsState>((set) => ({
  // State
  chats: [],
  filteredChats: [],
  searchQuery: '',
  filterTab: 'priority',

  // Actions
  initializeChats: () => {
    set({
      chats: CHATS_MOCK_DATA,
      filteredChats: CHATS_MOCK_DATA,
    });
  },

  setSearchQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();
      const filtered = trimmedQuery
        ? state.chats.filter((chat) =>
            chat.name.toLowerCase().includes(trimmedQuery) ||
            chat.lastMsg.toLowerCase().includes(trimmedQuery)
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

  addChat: (chat: ChatPreview) => {
    set((state) => ({
      chats: [chat, ...state.chats],
      filteredChats: [chat, ...state.filteredChats],
    }));
  },

  deleteChat: (chatId: string) => {
    set((state) => {
      const updatedChats = state.chats.filter((c) => c.id !== chatId);
      return {
        chats: updatedChats,
        filteredChats: updatedChats,
      };
    });
  },

  updateChat: (chatId: string, updates: Partial<ChatPreview>) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
      filteredChats: state.filteredChats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
    }));
  },
}));

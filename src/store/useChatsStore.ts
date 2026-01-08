import { create } from 'zustand';
import { CHATS_V2 } from '../data/chatsMockData';
import { ConversationV2 } from '../types/chat';

interface ChatsState {
  // State
  chats: ConversationV2[];
  filteredChats: ConversationV2[];
  searchQuery: string;
  filterTab: 'priority' | 'other';

  // Actions
  initializeChats: () => void;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: 'priority' | 'other') => void;
  addChat: (chat: ConversationV2) => void;
  deleteChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ConversationV2>) => void;
}

export const useChatsStore = create<ChatsState>((set) => ({
  // State
  chats: [],
  filteredChats: [],
  searchQuery: '',
  filterTab: 'priority',

  // Actions
  initializeChats: () => {
    // Initialize directly from v2 conversations (preferred) and expose
    // ConversationV2 objects to components.
    if (CHATS_V2 && CHATS_V2.length) {
      set({ chats: CHATS_V2, filteredChats: CHATS_V2 });
      return;
    }
    // No v2 chats available — initialize empty lists
    set({ chats: [], filteredChats: [] });
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
      filteredChats: state.filteredChats.map((c) => (c.conversationId === chatId ? { ...c, ...updates } : c)),
    }));
  },
}));

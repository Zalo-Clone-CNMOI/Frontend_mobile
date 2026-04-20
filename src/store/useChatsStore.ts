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
  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string, shouldIncrementUnread?: boolean) => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;
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
      // Sort by lastMessageAt descending (newest first)
      const sortedConversations = [...conversations].sort((a, b) => {
        const timeA = a.lastMessageAt || 0;
        const timeB = b.lastMessageAt || 0;
        return timeB - timeA;
      });
      set({ chats: sortedConversations, filteredChats: sortedConversations, isLoading: false });
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

  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string, shouldIncrementUnread?: boolean) => {
    set((state) => {
      const updateConversation = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          // Only increment unread if message is not from current user
          const currentUnread = chat.unreadCount || 0;
          const newUnread = shouldIncrementUnread ? currentUnread + 1 : currentUnread;
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
            unreadCount: newUnread,
          };
        }
        return chat;
      };

      const updatedChats = state.chats.map(updateConversation);
      // Move updated conversation to top (if found)
      const updatedChat = updatedChats.find(c => c.conversationId === conversationId);
      const sortedChats = updatedChat
        ? [updatedChat, ...updatedChats.filter(c => c.conversationId !== conversationId)]
        : updatedChats;

      const updatedFiltered = state.filteredChats.map(updateConversation);
      const updatedFilteredChat = updatedFiltered.find(c => c.conversationId === conversationId);
      const sortedFiltered = updatedFilteredChat
        ? [updatedFilteredChat, ...updatedFiltered.filter(c => c.conversationId !== conversationId)]
        : updatedFiltered;

      return {
        chats: sortedChats,
        filteredChats: sortedFiltered,
      };
    });
  },

  incrementUnreadCount: (conversationId: string) => {
    set((state) => {
      const updateUnread = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          return {
            ...chat,
            unreadCount: (chat.unreadCount || 0) + 1,
          };
        }
        return chat;
      };
      return {
        chats: state.chats.map(updateUnread),
        filteredChats: state.filteredChats.map(updateUnread),
      };
    });
  },

  resetUnreadCount: (conversationId: string) => {
    set((state) => {
      const now = Date.now();
      const updateUnread = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          return {
            ...chat,
            unreadCount: 0,
            myLastReadAt: now, // Update lastReadAt when marking as read
          };
        }
        return chat;
      };
      return {
        chats: state.chats.map(updateUnread),
        filteredChats: state.filteredChats.map(updateUnread),
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

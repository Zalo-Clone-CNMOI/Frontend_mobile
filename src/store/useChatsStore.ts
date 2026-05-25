import { create } from 'zustand';
import { fetchConversations } from '../services/chatService';
import type { ConversationV2 } from '../types/chat';
import { formatPreviewContent } from '../utils/messagePreviewFormatter';
// TODO: Migrate to new Conversation type from '../types/interface/chat-interface' when ready

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
  updateConversationRole: (conversationId: string, role: 'owner' | 'admin' | 'member') => void;
  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string, shouldIncrementUnread?: boolean) => void;
  updateConversationPinStatus: (conversationId: string, isPinned: boolean) => void;
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
      // Sort: pinned conversations first, then by pinnedAt/lastMessageAt
      const sortedConversations = [...conversations].sort((a, b) => {
        // Pinned items come first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Both pinned: sort by pinnedAt (newest first)
        if (a.pinned && b.pinned) {
          return (b.pinnedAt || 0) - (a.pinnedAt || 0);
        }

        // Both unpinned: sort by lastMessageAt (newest first)
        return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
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
    set((state) => {
      // Insert pinned chats at beginning, unpinned after all pinned
      const insertChat = (chats: ConversationV2[]) => {
        if (chat.pinned) {
          // Insert at beginning for pinned chats
          return [chat, ...chats];
        } else {
          // Insert after all pinned chats for unpinned
          const firstUnpinnedIndex = chats.findIndex(c => !c.pinned);
          if (firstUnpinnedIndex === -1) {
            return [...chats, chat]; // All are pinned, append at end
          }
          return [
            ...chats.slice(0, firstUnpinnedIndex),
            chat,
            ...chats.slice(firstUnpinnedIndex),
          ];
        }
      };

      return {
        chats: insertChat(state.chats),
        filteredChats: insertChat(state.filteredChats),
      };
    });
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

  updateConversationRole: (conversationId: string, role: 'owner' | 'admin' | 'member') => {
    set((state) => ({
      chats: state.chats.map((c) =>
        c.conversationId === conversationId ? { ...c, myRole: role } : c
      ),
      filteredChats: state.filteredChats.map((c) =>
        c.conversationId === conversationId ? { ...c, myRole: role } : c
      ),
    }));
  },

  updateLastMessage: (conversationId: string, content: string, type: string, timestamp: number, senderId?: string, senderName?: string, shouldIncrementUnread?: boolean) => {
    set((state) => {
      const updateConversation = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          // Format preview content based on type
          let previewContent = content;
          if (type === 'image') {
            previewContent = 'Đã gửi 1 ảnh';
          } else if (type === 'video') {
            previewContent = 'Đã gửi 1 video';
          } else if (type === 'file') {
            previewContent = 'Đã gửi 1 tệp đính kèm';
          } else if (type === 'voice') {
            previewContent = 'Tin nhắn thoại';
          } else if (type === 'deleted' || type === 'revoked') {
            previewContent = 'Tin nhắn đã được thu hồi';
          } else if (type === 'poll') {
            previewContent = content || 'Bình chọn';
          }

          // Only increment unread if message is not from current user
          const currentUnread = chat.unreadCount || 0;
          const newUnread = shouldIncrementUnread ? currentUnread + 1 : currentUnread;
          return {
            ...chat,
            lastMessage: {
              content: previewContent,
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

      // Sort helper: pinned first, then by pinnedAt/lastMessageAt
      const sortChats = (chats: ConversationV2[]) => {
        return [...chats].sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          if (a.pinned && b.pinned) {
            return (b.pinnedAt || 0) - (a.pinnedAt || 0);
          }
          return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
        });
      };

      const updatedChats = state.chats.map(updateConversation);
      const updatedFiltered = state.filteredChats.map(updateConversation);

      return {
        chats: sortChats(updatedChats),
        filteredChats: sortChats(updatedFiltered),
      };
    });
  },

  updateConversationPinStatus: (conversationId: string, isPinned: boolean) => {
    set((state) => {
      const updatePin = (chat: ConversationV2) => {
        if (chat.conversationId === conversationId) {
          return {
            ...chat,
            pinned: isPinned,
            pinnedAt: isPinned ? Date.now() : undefined,
          };
        }
        return chat;
      };

      // Sort: pinned conversations first, then by pinnedAt/lastMessageAt (same as Frontend_web)
      const sortChats = (chats: ConversationV2[]) => {
        return [...chats].sort((a, b) => {
          // Pinned items come first
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;

          // Both pinned: sort by pinnedAt (newest first)
          if (a.pinned && b.pinned) {
            return (b.pinnedAt || 0) - (a.pinnedAt || 0);
          }

          // Both unpinned: sort by lastMessageAt (newest first)
          return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
        });
      };

      const updatedChats = state.chats.map(updatePin);
      const updatedFiltered = state.filteredChats.map(updatePin);

      return {
        chats: sortChats(updatedChats),
        filteredChats: sortChats(updatedFiltered),
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

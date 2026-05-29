import { create } from 'zustand';
import { fetchConversations } from '../services/chatService';

import type { ConversationV2 } from '../types/chat';

interface ChatsState {
  chats: ConversationV2[];
  filteredChats: ConversationV2[];

  searchQuery: string;

  filterTab: 'priority' | 'other';

  isLoading: boolean;

  error: string | null;

  initializeChats: () => Promise<void>;

  setSearchQuery: (query: string) => void;

  setFilterTab: (
    tab: 'priority' | 'other'
  ) => void;

  addChat: (chat: ConversationV2) => void;

  deleteChat: (chatId: string) => void;

  updateChat: (
    chatId: string,
    updates: Partial<ConversationV2>
  ) => void;

  updateConversationRole: (
    conversationId: string,
    role: 'owner' | 'admin' | 'member'
  ) => void;

  updateLastMessage: (
    conversationId: string,
    content: string,
    type: string,
    timestamp: number,
    senderId?: string,
    senderName?: string,
    shouldIncrementUnread?: boolean
  ) => void;

  updateConversationPinStatus: (
    conversationId: string,
    isPinned: boolean
  ) => void;

  incrementUnreadCount: (
    conversationId: string
  ) => void;

  /**
   * clearUnread = false
   * -> only update myLastReadAt
   *
   * clearUnread = true
   * -> reset unread count
   */
  resetUnreadCount: (
    conversationId: string,
    clearUnread?: boolean
  ) => void;

  reset: () => void;
}

export const useChatsStore =
  create<ChatsState>((set) => ({
    chats: [],

    filteredChats: [],

    searchQuery: '',

    filterTab: 'priority',

    isLoading: false,

    error: null,

    initializeChats: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const conversations =
          await fetchConversations();

        const sortedConversations = [
          ...conversations,
        ].sort((a, b) => {
          /**
           * pinned first
           */
          if (a.pinned && !b.pinned)
            return -1;

          if (!a.pinned && b.pinned)
            return 1;

          /**
           * both pinned
           */
          if (a.pinned && b.pinned) {
            return (
              (b.pinnedAt || 0) -
              (a.pinnedAt || 0)
            );
          }

          /**
           * both unpinned
           */
          return (
            (b.lastMessageAt || 0) -
            (a.lastMessageAt || 0)
          );
        });

        set({
          chats: sortedConversations,

          filteredChats:
            sortedConversations,

          isLoading: false,
        });
      } catch (err) {
        set({
          error: String(err),
          isLoading: false,
        });
      }
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        const trimmedQuery =
          query.trim().toLowerCase();

        const filtered = trimmedQuery
          ? state.chats.filter((chat) =>
              (chat.name || '')
                .toLowerCase()
                .includes(trimmedQuery) ||
              (
                chat.lastMessage?.content || ''
              )
                .toLowerCase()
                .includes(trimmedQuery)
            )
          : state.chats;

        return {
          searchQuery: query,

          filteredChats: filtered,
        };
      });
    },

    setFilterTab: (
      tab: 'priority' | 'other'
    ) => {
      set({ filterTab: tab });
    },

    addChat: (chat: ConversationV2) => {
      set((state) => {
        const insertChat = (
          chats: ConversationV2[]
        ) => {
          /**
           * pinned chat
           */
          if (chat.pinned) {
            return [chat, ...chats];
          }

          /**
           * insert after pinned section
           */
          const firstUnpinnedIndex =
            chats.findIndex(
              (c) => !c.pinned
            );

          if (firstUnpinnedIndex === -1) {
            return [...chats, chat];
          }

          return [
            ...chats.slice(
              0,
              firstUnpinnedIndex
            ),

            chat,

            ...chats.slice(
              firstUnpinnedIndex
            ),
          ];
        };

        return {
          chats: insertChat(state.chats),

          filteredChats: insertChat(
            state.filteredChats
          ),
        };
      });
    },

    deleteChat: (chatId: string) => {
      set((state) => {
        const updatedChats =
          state.chats.filter(
            (c) =>
              c.conversationId !== chatId
          );

        return {
          chats: updatedChats,

          filteredChats: updatedChats,
        };
      });
    },

    updateChat: (
      chatId: string,
      updates: Partial<ConversationV2>
    ) => {
      set((state) => ({
        chats: state.chats.map((c) =>
          c.conversationId === chatId
            ? {
                ...c,
                ...updates,
              }
            : c
        ),

        filteredChats:
          state.filteredChats.map((c) =>
            c.conversationId === chatId
              ? {
                  ...c,
                  ...updates,
                }
              : c
          ),
      }));
    },

    updateConversationRole: (
      conversationId: string,
      role:
        | 'owner'
        | 'admin'
        | 'member'
    ) => {
      set((state) => ({
        chats: state.chats.map((c) =>
          c.conversationId ===
          conversationId
            ? {
                ...c,
                myRole: role,
              }
            : c
        ),

        filteredChats:
          state.filteredChats.map((c) =>
            c.conversationId ===
            conversationId
              ? {
                  ...c,
                  myRole: role,
                }
              : c
          ),
      }));
    },

    updateLastMessage: (
      conversationId: string,
      content: string,
      type: string,
      timestamp: number,
      senderId?: string,
      senderName?: string,
      shouldIncrementUnread?: boolean
    ) => {
      set((state) => {
        const updateConversation = (
          chat: ConversationV2
        ) => {
          if (
            chat.conversationId !==
            conversationId
          ) {
            return chat;
          }

          let previewContent = content;

          switch (type) {
            case 'image':
              previewContent =
                'Đã gửi 1 ảnh';
              break;

            case 'video':
              previewContent =
                'Đã gửi 1 video';
              break;

            case 'file':
              previewContent =
                'Đã gửi 1 tệp đính kèm';
              break;

            case 'voice':
              previewContent =
                'Tin nhắn thoại';
              break;

            case 'deleted':
            case 'revoked':
              previewContent =
                'Tin nhắn đã được thu hồi';
              break;

            case 'poll':
              previewContent =
                content || 'Bình chọn';
              break;
          }

          const currentUnread =
            chat.unreadCount || 0;

          const newUnread =
            shouldIncrementUnread
              ? currentUnread + 1
              : currentUnread;

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
        };

        const sortChats = (
          chats: ConversationV2[]
        ) => {
          return [...chats].sort(
            (a, b) => {
              if (
                a.pinned &&
                !b.pinned
              )
                return -1;

              if (
                !a.pinned &&
                b.pinned
              )
                return 1;

              if (
                a.pinned &&
                b.pinned
              ) {
                return (
                  (b.pinnedAt || 0) -
                  (a.pinnedAt || 0)
                );
              }

              return (
                (b.lastMessageAt ||
                  0) -
                (a.lastMessageAt || 0)
              );
            }
          );
        };

        const updatedChats =
          state.chats.map(
            updateConversation
          );

        const updatedFiltered =
          state.filteredChats.map(
            updateConversation
          );

        return {
          chats: sortChats(updatedChats),

          filteredChats:
            sortChats(updatedFiltered),
        };
      });
    },

    updateConversationPinStatus: (
      conversationId: string,
      isPinned: boolean
    ) => {
      set((state) => {
        const updatePin = (
          chat: ConversationV2
        ) => {
          if (
            chat.conversationId ===
            conversationId
          ) {
            return {
              ...chat,

              pinned: isPinned,

              pinnedAt: isPinned
                ? Date.now()
                : undefined,
            };
          }

          return chat;
        };

        const sortChats = (
          chats: ConversationV2[]
        ) => {
          return [...chats].sort(
            (a, b) => {
              if (
                a.pinned &&
                !b.pinned
              )
                return -1;

              if (
                !a.pinned &&
                b.pinned
              )
                return 1;

              if (
                a.pinned &&
                b.pinned
              ) {
                return (
                  (b.pinnedAt || 0) -
                  (a.pinnedAt || 0)
                );
              }

              return (
                (b.lastMessageAt ||
                  0) -
                (a.lastMessageAt || 0)
              );
            }
          );
        };

        const updatedChats =
          state.chats.map(updatePin);

        const updatedFiltered =
          state.filteredChats.map(
            updatePin
          );

        return {
          chats: sortChats(updatedChats),

          filteredChats:
            sortChats(updatedFiltered),
        };
      });
    },

    incrementUnreadCount: (
      conversationId: string
    ) => {
      set((state) => {
        const updateUnread = (
          chat: ConversationV2
        ) => {
          if (
            chat.conversationId ===
            conversationId
          ) {
            return {
              ...chat,

              unreadCount:
                (chat.unreadCount || 0) +
                1,
            };
          }

          return chat;
        };

        return {
          chats: state.chats.map(
            updateUnread
          ),

          filteredChats:
            state.filteredChats.map(
              updateUnread
            ),
        };
      });
    },

    resetUnreadCount: (
      conversationId: string,
      clearUnread: boolean = true
    ) => {
      set((state) => {
        const now = Date.now();

        const updateUnread = (
          chat: ConversationV2
        ) => {
          if (
            chat.conversationId ===
            conversationId
          ) {
            return {
              ...chat,

              /**
               * only clear when needed
               */
              unreadCount: clearUnread
                ? 0
                : chat.unreadCount,

              /**
               * always update read timestamp
               */
              myLastReadAt: now,
            };
          }

          return chat;
        };

        return {
          chats: state.chats.map(
            updateUnread
          ),

          filteredChats:
            state.filteredChats.map(
              updateUnread
            ),
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
import { create } from 'zustand';
import { fetchAllMessages } from '../services/chatService';
import { ChatMessage } from '../types/chat';

interface MessagesState {
  messagesByChatId: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;

  // Track tempId → serverId mapping for optimistic updates
  tempIdToServerId: Map<string, string>;

  // Track pinned messages per conversation
  pinnedMessagesByChatId: Record<string, Set<string>>;

  initializeMessages: () => Promise<void>;
  getMessagesByChatId: (chatId: string) => ChatMessage[];
  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  setMessagesForChat: (chatId: string, messages: ChatMessage[]) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  revokeMessage: (chatId: string, messageId: string) => void;
  addReaction: (chatId: string, messageId: string, userId: string, reactionType: string) => void;
  removeReaction: (chatId: string, messageId: string, userId: string) => void;
  setMessageReactions: (chatId: string, messageId: string, reactions: Record<string, string[]>) => void;
  mergeMessageId: (tempId: string, serverId: string) => void;
  
  // Pinned message methods
  setPinnedMessages: (chatId: string, messageIds: string[]) => void;
  addPinnedMessage: (chatId: string, messageId: string) => void;
  removePinnedMessage: (chatId: string, messageId: string) => void;
  isMessagePinned: (chatId: string, messageId: string) => boolean;
  
  reset: () => void;
}

const sortMessagesAscending = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const ta = Number(a.timestamp || 0);
    const tb = Number(b.timestamp || 0);
    if (ta !== tb) return ta - tb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
};

const dedupeMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const map = new Map<string, ChatMessage>();
  for (const msg of messages) {
    const key = String(msg.id || '').trim() || `${msg.conversationId || 'chat'}:${msg.senderId || ''}:${msg.timestamp || 0}:${msg.text || ''}`;
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, ...msg } : msg);
  }
  return Array.from(map.values());
};

const REVOKED_RESTORE_TTL_MS = 30_000;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messagesByChatId: {},
  isLoading: false,
  error: null,
  tempIdToServerId: new Map<string, string>(),
  pinnedMessagesByChatId: {},

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
          [chatId]: sortMessagesAscending([...existing, newMessage]),
        },
      };
    });
  },

  addMessage: (chatId, message) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      const incomingId = String(message.id || '').trim();
      const incomingServerId = String(message.serverMessageId || '').trim();

      // Check for tempId → serverId merge
      const tempIdMatch = Array.from(state.tempIdToServerId.entries())
        .find(([tempId, srvId]) => srvId === incomingServerId || tempId === incomingId);

      if (tempIdMatch) {
        const [tempId, serverId] = tempIdMatch;
        const targetIndex = existing.findIndex(m => m.id === tempId);

        if (targetIndex >= 0) {
          // Merge with existing temp message - replace tempId with serverId
          const updated = [...existing];
          updated[targetIndex] = { ...updated[targetIndex], ...message, id: serverId };

          const newMapping = new Map(state.tempIdToServerId);
          newMapping.delete(tempId);

          return {
            messagesByChatId: {
              ...state.messagesByChatId,
              [chatId]: sortMessagesAscending(updated),
            },
            tempIdToServerId: newMapping,
          };
        }
      }

      const normalizedMessageId = String(message.id || '').trim();
      const dedupeIndexById = normalizedMessageId
        ? existing.findIndex((m) => String(m.id || '').trim() === normalizedMessageId)
        : -1;

      const dedupeIndexBySignature =
        dedupeIndexById >= 0
          ? dedupeIndexById
          : existing.findIndex(
              (m) =>
                m.timestamp === message.timestamp &&
                (m.senderId || '') === (message.senderId || '') &&
                (m.text || '') === (message.text || ''),
            );

      const index = dedupeIndexBySignature;

      // Preserve revoked state from existing message

      if (index >= 0) {
        const updated = [...existing];
        const existingMsg = updated[index];
        const merged = { ...existingMsg, ...message };

        // Preserve revoked state from existing message
        if (existingMsg.isRevoked && !message.isRevoked) {
          merged.isRevoked = true;
        }
        // Preserve backup text from existing message
        if (existingMsg.revokedBackupText && !message.revokedBackupText) {
          merged.revokedBackupText = existingMsg.revokedBackupText;
        }

        if (existingMsg.fromMe === true && message.fromMe !== true) {
          merged.fromMe = true;
        }
        if (!message.senderId && existingMsg.senderId) {
          merged.senderId = existingMsg.senderId;
        }
        if (!message.replyTo && existingMsg.replyTo) {
          merged.replyTo = existingMsg.replyTo;
        }
        if (!message.fileInfo && existingMsg.fileInfo) {
          merged.fileInfo = existingMsg.fileInfo;
        }
        if (!message.serverMessageId && existingMsg.serverMessageId) {
          merged.serverMessageId = existingMsg.serverMessageId;
        }
        // Preserve senderAvatar from existing message
        if (!message.senderAvatar && existingMsg.senderAvatar) {
          merged.senderAvatar = existingMsg.senderAvatar;
        }
        // Preserve senderName from existing message
        if (!message.senderName && existingMsg.senderName) {
          merged.senderName = existingMsg.senderName;
        }
        // Preserve reactions from existing message
        if (existingMsg.reactions && !message.reactions) {
          merged.reactions = existingMsg.reactions;
        }
        // Merge reactions if both exist
        if (existingMsg.reactions && message.reactions) {
          const mergedReactions: Record<string, string[]> = {};
          Object.keys({ ...existingMsg.reactions, ...message.reactions }).forEach(key => {
            const existingUsers = existingMsg.reactions?.[key] || [];
            const newUsers = message.reactions?.[key] || [];
            mergedReactions[key] = [...new Set([...existingUsers, ...newUsers])];
          });
          merged.reactions = mergedReactions;
        }

        // Preserve reactions from existing message

        updated[index] = merged;
        return {
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatId]: sortMessagesAscending(updated),
          },
        };
      }
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: sortMessagesAscending([...existing, message]),
        },
      };
    });
  },

  setMessagesForChat: (chatId, messages) => {

    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: sortMessagesAscending(dedupeMessages(messages)),
      },
    }));
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      const target = existing.find((m) => m.id === messageId);
      if (!target) return state;

      const hasAnyChange = Object.entries(updates).some(([key, value]) => (target as any)[key] !== value);
      if (!hasAnyChange) return state;

      // Preserve revoked state when updating
      const safeUpdates = { ...updates };
      if (target.isRevoked && !updates.isRevoked) {
        delete (safeUpdates as any).isRevoked;
      }
      if (target.revokedBackupText && !updates.revokedBackupText) {
        delete (safeUpdates as any).revokedBackupText;
      }
      // Preserve reactions when updating (unless explicitly updated)
      if (target.reactions && !updates.reactions) {
        (safeUpdates as any).reactions = target.reactions;
      }

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: sortMessagesAscending(existing.map((m) => (m.id === messageId ? { ...m, ...safeUpdates } : m))),
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
      const now = Date.now();
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  revokedBackupText: m.revokedBackupText || m.text || '',
                  text: '',
                  isRevoked: true,
                  revokeRestoreUntil: now + REVOKED_RESTORE_TTL_MS,
                }
              : m
          ),
        },
      };
    });
  },

  addReaction: (chatId, messageId, userId, reactionType) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions || {};
            const currentUsers = reactions[reactionType] || [];
            if (currentUsers.includes(userId)) return m;
            return {
              ...m,
              reactions: {
                ...reactions,
                [reactionType]: [...currentUsers, userId],
              },
            };
          }),
        },
      };
    });
  },

  removeReaction: (chatId, messageId, userId) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions || {};
            const newReactions: Record<string, string[]> = {};
            Object.entries(reactions).forEach(([type, users]) => {
              newReactions[type] = users.filter((u) => u !== userId);
            });
            return {
              ...m,
              reactions: newReactions,
            };
          }),
        },
      };
    });
  },

  setMessageReactions: (chatId, messageId, reactions) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: existing.map((m) => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              reactions,
            };
          }),
        },
      };
    });
  },

  mergeMessageId: (tempId, serverId) => {
    set((state) => {
      const newMapping = new Map(state.tempIdToServerId);
      newMapping.set(tempId, serverId);
      return { tempIdToServerId: newMapping };
    });
  },

  setPinnedMessages: (chatId, messageIds) => {
    set((state) => ({
      pinnedMessagesByChatId: {
        ...state.pinnedMessagesByChatId,
        [chatId]: new Set(messageIds),
      },
    }));
  },

  addPinnedMessage: (chatId, messageId) => {
    set((state) => {
      const currentSet = state.pinnedMessagesByChatId[chatId] || new Set();
      const newSet = new Set(currentSet);
      newSet.add(messageId);
      return {
        pinnedMessagesByChatId: {
          ...state.pinnedMessagesByChatId,
          [chatId]: newSet,
        },
      };
    });
  },

  removePinnedMessage: (chatId, messageId) => {
    set((state) => {
      const currentSet = state.pinnedMessagesByChatId[chatId] || new Set();
      const newSet = new Set(currentSet);
      newSet.delete(messageId);
      return {
        pinnedMessagesByChatId: {
          ...state.pinnedMessagesByChatId,
          [chatId]: newSet,
        },
      };
    });
  },

  isMessagePinned: (chatId, messageId) => {
    const state = get();
    const pinnedSet = state.pinnedMessagesByChatId[chatId];
    return pinnedSet ? pinnedSet.has(messageId) : false;
  },

  reset: () => {
    set({
      messagesByChatId: {},
      isLoading: false,
      error: null,
      tempIdToServerId: new Map(),
      pinnedMessagesByChatId: {},
    });
  },
}));

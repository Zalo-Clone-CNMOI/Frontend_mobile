import { create } from 'zustand';
import { fetchAllMessages } from '../services/chatService';
import { ChatMessage } from '../types/chat';

interface MessagesState {
  messagesByChatId: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;

  // Track tempId → serverId mapping for optimistic updates
  tempIdToServerId: Map<string, string>;
  // Track cleanup timers to prevent memory leaks
  tempIdCleanupTimers: Map<string, ReturnType<typeof setTimeout>>;

  // Track pinned messages per conversation (message IDs only)
  pinnedMessagesByChatId: Record<string, Set<string>>;

  initializeMessages: () => Promise<void>;
  getMessagesByChatId: (chatId: string) => ChatMessage[];
  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  setMessagesForChat: (chatId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
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

  // Moderation methods
  markMessageRemoved: (chatId: string, messageId: string, reason?: string) => void;

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
  tempIdCleanupTimers: new Map<string, ReturnType<typeof setTimeout>>(),
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

      // ✅ FIX 4: Check for tempId → serverId merge (optimistic UI reconciliation)
      const tempIdMatch = Array.from(state.tempIdToServerId.entries())
        .find(([tempId, srvId]) => srvId === incomingServerId || tempId === incomingId);

      if (tempIdMatch) {
        const [tempId, serverId] = tempIdMatch;
        const targetIndex = existing.findIndex(m => m.id === tempId);

        if (targetIndex >= 0) {
          // Merge with existing temp message - replace tempId with serverId
          const updated = [...existing];
          updated[targetIndex] = { 
            ...updated[targetIndex], 
            ...message, 
            id: serverId,
            status: 'sent', // ✅ Auto update status khi reconcile
          };

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

      // ✅ FIX 4: Tự động reconcile optimistic message dựa trên serverMessageId hoặc status
      const optimisticMatchIndex = existing.findIndex(m => 
        // Match by serverMessageId
        (incomingServerId && m.serverMessageId === incomingServerId) ||
        // Match by ID nếu đang sending và có serverMessageId mới
        (m.id === incomingId && m.status === 'sending' && incomingServerId) ||
        // Match temp message khi incoming message là confirmation
        (m.status === 'sending' && m.serverMessageId === incomingServerId)
      );

      if (optimisticMatchIndex >= 0) {
        const updated = [...existing];
        const existingMsg = updated[optimisticMatchIndex];
        
        // Merge và update status
        updated[optimisticMatchIndex] = {
          ...existingMsg,
          ...message,
          id: incomingServerId || existingMsg.id,
          status: message.status === 'sent' || !existingMsg.serverMessageId ? 'sent' : existingMsg.status,
        };

        return {
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatId]: sortMessagesAscending(updated),
          },
        };
      }

      // Idempotent update: Check if message already exists by ID
      const normalizedMessageId = String(message.id || '').trim();
      const dedupeIndexById = normalizedMessageId
        ? existing.findIndex((m) => String(m.id || '').trim() === normalizedMessageId)
        : -1;

      // If message already exists by ID, perform idempotent merge (update only)
      if (dedupeIndexById >= 0) {
        const updated = [...existing];
        const existingMsg = updated[dedupeIndexById];
        const merged = { ...existingMsg, ...message };

        // Preserve critical state from existing message
        if (existingMsg.isRevoked && !message.isRevoked) {
          merged.isRevoked = true;
        }
        if (existingMsg.revokedBackupText && !message.revokedBackupText) {
          merged.revokedBackupText = existingMsg.revokedBackupText;
        }
        if (existingMsg.fromMe === true && message.fromMe !== true) {
          merged.fromMe = true;
        }
        // Preserve fields from existing if not in incoming
        // NOTE: type and messageType should NOT be preserved - they can change (e.g., text -> system)
        const fieldsToPreserve = ['replyTo', 'fileInfo', 'serverMessageId', 'senderAvatar', 'senderName', 'reactions'];
        fieldsToPreserve.forEach(field => {
          if (!message[field as keyof ChatMessage] && existingMsg[field as keyof ChatMessage]) {
            (merged as any)[field] = existingMsg[field as keyof ChatMessage];
          }
        });

        // Merge reactions if both exist
        if (existingMsg.reactions && message.reactions) {
          const mergedReactions: Record<string, string[]> = {};
          const allKeys = Array.from(new Set([...Object.keys(existingMsg.reactions), ...Object.keys(message.reactions)]));
          allKeys.forEach(key => {
            const existingUsers = existingMsg.reactions?.[key] || [];
            const newUsers = message.reactions?.[key] || [];
            mergedReactions[key] = Array.from(new Set([...existingUsers, ...newUsers]));
          });
          merged.reactions = mergedReactions;
        }

        updated[dedupeIndexById] = merged;
        return {
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatId]: sortMessagesAscending(updated),
          },
        };
      }

      // Message doesn't exist - append new message
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: sortMessagesAscending([...existing, message]),
        },
      };
    });
  },

  setMessagesForChat: (chatId, messagesOrUpdater) => {
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      // Support functional updates like React useState
      const messages = typeof messagesOrUpdater === 'function'
        ? (messagesOrUpdater as (prev: ChatMessage[]) => ChatMessage[])(existing)
        : messagesOrUpdater;
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: sortMessagesAscending(dedupeMessages(messages)),
        },
      };
    });
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
          [chatId]: existing.map((m) => {
            const isTargetMessage = m.id === messageId;
            const replyTo = m.replyTo;
            const isReplyToTarget = replyTo?.id === messageId;

            if (!isTargetMessage && !isReplyToTarget) return m;

            return {
              ...m,
              // Handle target message deletion
              ...(isTargetMessage ? {
                revokedBackupText: m.revokedBackupText || m.text || '',
                text: '',
                isRevoked: true,
                revokeRestoreUntil: now + REVOKED_RESTORE_TTL_MS,
              } : {}),
              // Handle reply to deleted message
              ...(replyTo && isReplyToTarget ? {
                replyTo: {
                  ...replyTo,
                  id: replyTo.id,
                  senderId: replyTo.senderId,
                  text: '',
                  isRevoked: true,
                },
              } : {}),
            };
          }),
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

  // ✅ FIX 5: mergeMessageId với proper timer tracking và auto-cleanup
  mergeMessageId: (tempId, serverId) => {
    set((state) => {
      // Cancel existing timer for this tempId if any
      const existingTimer = state.tempIdCleanupTimers.get(tempId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const newMapping = new Map(state.tempIdToServerId);
      newMapping.set(tempId, serverId);

      // Create new cleanup timer
      const TEMP_ID_TTL_MS = 60000;
      const newTimer = setTimeout(() => {
        set((s) => {
          const cleanupMapping = new Map(s.tempIdToServerId);
          const cleanupTimers = new Map(s.tempIdCleanupTimers);
          cleanupMapping.delete(tempId);
          cleanupTimers.delete(tempId);
          // Chỉ update nếu map thực sự thay đổi
          if (cleanupMapping.size !== s.tempIdToServerId.size) {
            return { tempIdToServerId: cleanupMapping, tempIdCleanupTimers: cleanupTimers };
          }
          return s;
        });
      }, TEMP_ID_TTL_MS);

      const newTimers = new Map(state.tempIdCleanupTimers);
      newTimers.set(tempId, newTimer);

      return { tempIdToServerId: newMapping, tempIdCleanupTimers: newTimers };
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

  markMessageRemoved: (chatId, messageId, reason) => {
    set((state) => {
      const messages = state.messagesByChatId[chatId];
      if (!messages) return state;

      const updatedMessages = messages.map((msg) => {
        if (msg.id === messageId || msg.serverMessageId === messageId) {
          return {
            ...msg,
            removed: true,
            removalReason: reason || 'ai_moderation',
          };
        }
        return msg;
      });

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: updatedMessages,
        },
      };
    });
  },

  reset: () => {
    // Clear all pending cleanup timers
    const state = get();
    state.tempIdCleanupTimers.forEach((timer) => clearTimeout(timer));
    
    set({
      messagesByChatId: {},
      isLoading: false,
      error: null,
      tempIdToServerId: new Map(),
      tempIdCleanupTimers: new Map(),
      pinnedMessagesByChatId: {},
    });
  },
}));

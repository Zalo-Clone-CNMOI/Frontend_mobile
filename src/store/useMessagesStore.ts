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
  setMessagesForChat: (chatId: string, messages: ChatMessage[]) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  revokeMessage: (chatId: string, messageId: string) => void;
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
      if (index >= 0) {
        const updated = [...existing];
        const merged = { ...updated[index], ...message };
        // Never flip ownership from "mine" to "other" due to partial/ambiguous socket payload.
        if (updated[index].fromMe === true && message.fromMe !== true) {
          merged.fromMe = true;
        }
        if (!message.senderId && updated[index].senderId) {
          merged.senderId = updated[index].senderId;
        }
        if (!message.replyTo && updated[index].replyTo) {
          merged.replyTo = updated[index].replyTo;
        }
        if (!message.fileInfo && updated[index].fileInfo) {
          merged.fileInfo = updated[index].fileInfo;
        }
        if (!message.serverMessageId && updated[index].serverMessageId) {
          merged.serverMessageId = updated[index].serverMessageId;
        }
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

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: sortMessagesAscending(existing.map((m) => (m.id === messageId ? { ...m, ...updates } : m))),
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

  reset: () => {
    set({
      messagesByChatId: {},
      isLoading: false,
      error: null,
    });
  },
}));

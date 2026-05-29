import { create } from 'zustand';

interface StreamingMessage {
  messageId: string;
  chunks: string[];
  complete: boolean;
}

interface ZaiChatState {
  zaiTypingByConversation: Map<string, boolean>;
  streamingMessagesByConversation: Map<string, StreamingMessage>;

  setZaiTyping(conversationId: string, isTyping: boolean): void;
  isZaiTyping(conversationId: string): boolean;
  addStreamChunk(conversationId: string, messageId: string, chunk: string): void;
  completeStream(conversationId: string, messageId: string): void;
  getStreamingText(conversationId: string): string | null;
  isStreamActive(conversationId: string): boolean;
  clearStreaming(conversationId: string): void;
}

export const useZaiChatStore = create<ZaiChatState>((set, get) => ({
  zaiTypingByConversation: new Map(),
  streamingMessagesByConversation: new Map(),

  setZaiTyping: (conversationId, isTyping) => {
    set((state) => {
      const newMap = new Map(state.zaiTypingByConversation);
      if (isTyping) {
        newMap.set(conversationId, true);
      } else {
        newMap.delete(conversationId);
      }
      return { zaiTypingByConversation: newMap };
    });
  },

  isZaiTyping: (conversationId) => {
    return get().zaiTypingByConversation.get(conversationId) || false;
  },

  addStreamChunk: (conversationId, messageId, chunk) => {
    set((state) => {
      const newMap = new Map(state.streamingMessagesByConversation);
      const existing = newMap.get(conversationId);
      if (existing && existing.messageId === messageId && !existing.complete) {
        // Immutable update: new StreamingMessage + new chunks array so selector
        // subscribers reading the nested object re-render reliably (Issue #9).
        newMap.set(conversationId, {
          ...existing,
          chunks: [...existing.chunks, chunk],
        });
      } else {
        newMap.set(conversationId, {
          messageId,
          chunks: [chunk],
          complete: false,
        });
      }
      return { streamingMessagesByConversation: newMap };
    });
  },

  completeStream: (conversationId, messageId) => {
    set((state) => {
      const newMap = new Map(state.streamingMessagesByConversation);
      const existing = newMap.get(conversationId);
      if (existing && existing.messageId === messageId) {
        // Immutable update: new object reference (Issue #9).
        newMap.set(conversationId, { ...existing, complete: true });
      }
      return { streamingMessagesByConversation: newMap };
    });
  },

  getStreamingText: (conversationId) => {
    const msg = get().streamingMessagesByConversation.get(conversationId);
    if (!msg) return null;
    return msg.chunks.join('');
  },

  isStreamActive: (conversationId) => {
    const msg = get().streamingMessagesByConversation.get(conversationId);
    return msg ? !msg.complete : false;
  },

  clearStreaming: (conversationId) => {
    set((state) => {
      const newMap = new Map(state.streamingMessagesByConversation);
      newMap.delete(conversationId);
      return { streamingMessagesByConversation: newMap };
    });
  },
}));
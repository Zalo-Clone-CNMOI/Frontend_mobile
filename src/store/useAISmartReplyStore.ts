import { create } from 'zustand';

interface AISmartReplyState {
  suggestions: Map<string, string[]>;
  loadingByConversation: Map<string, boolean>;
  errorByConversation: Map<string, string | null>;

  setSuggestions(conversationId: string, suggestions: string[]): void;
  clearSuggestions(conversationId: string): void;
  setLoading(conversationId: string, loading: boolean): void;
  setError(conversationId: string, error: string | null): void;
  getSuggestions(conversationId: string): string[];
  isLoading(conversationId: string): boolean;
}

export const useAISmartReplyStore = create<AISmartReplyState>((set, get) => ({
  suggestions: new Map(),
  loadingByConversation: new Map(),
  errorByConversation: new Map(),

  setSuggestions: (conversationId, suggestions) => {
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      newSuggestions.set(conversationId, suggestions);
      return { suggestions: newSuggestions };
    });
  },

  clearSuggestions: (conversationId) => {
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      newSuggestions.delete(conversationId);
      return { suggestions: newSuggestions };
    });
  },

  setLoading: (conversationId, loading) => {
    set((state) => {
      const newLoading = new Map(state.loadingByConversation);
      if (loading) {
        newLoading.set(conversationId, true);
      } else {
        newLoading.delete(conversationId);
      }
      return { loadingByConversation: newLoading };
    });
  },

  setError: (conversationId, error) => {
    set((state) => {
      const newError = new Map(state.errorByConversation);
      if (error) {
        newError.set(conversationId, error);
      } else {
        newError.delete(conversationId);
      }
      return { errorByConversation: newError };
    });
  },

  getSuggestions: (conversationId) => {
    return get().suggestions.get(conversationId) || [];
  },

  isLoading: (conversationId) => {
    return get().loadingByConversation.get(conversationId) || false;
  },
}));
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
    console.log('[useAISmartReplyStore] setSuggestions called:', { conversationId, suggestions });
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      console.log('[useAISmartReplyStore] new Map created, current keys:', Array.from(newSuggestions.keys()));
      newSuggestions.set(conversationId, suggestions);
      console.log('[useAISmartReplyStore] after set, keys:', Array.from(newSuggestions.keys()));
      console.log('[useAISmartReplyStore] value for conversationId:', newSuggestions.get(conversationId));
      return { suggestions: newSuggestions };
    });
    console.log('[useAISmartReplyStore] store updated, final state suggestions:', Array.from(get().suggestions.keys()));
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
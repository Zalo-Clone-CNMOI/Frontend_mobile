import { create } from 'zustand';

const SUMMARY_CACHE_TTL = 60 * 60 * 1000;

interface SummaryCache {
  summary: string;
  messageCount: number;
  cachedAt: number;
}

interface AISummaryState {
  summaries: Map<string, SummaryCache>;
  loadingByConversation: Map<string, boolean>;
  errorByConversation: Map<string, string | null>;

  getSummary(conversationId: string): SummaryCache | null;
  setSummary(conversationId: string, summary: string, messageCount: number): void;
  invalidate(conversationId: string): void;
  setLoading(conversationId: string, loading: boolean): void;
  setError(conversationId: string, error: string | null): void;
  isLoading(conversationId: string): boolean;
  getError(conversationId: string): string | null;
  clearExpired(): void;
}

export const useAISummaryStore = create<AISummaryState>((set, get) => ({
  summaries: new Map(),
  loadingByConversation: new Map(),
  errorByConversation: new Map(),

  getSummary: (conversationId) => {
    const cached = get().summaries.get(conversationId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.cachedAt > SUMMARY_CACHE_TTL) {
      const newSummaries = new Map(get().summaries);
      newSummaries.delete(conversationId);
      set({ summaries: newSummaries });
      return null;
    }

    return cached;
  },

  setSummary: (conversationId, summary, messageCount) => {
    set((state) => {
      const newSummaries = new Map(state.summaries);
      newSummaries.set(conversationId, {
        summary,
        messageCount,
        cachedAt: Date.now(),
      });
      return { summaries: newSummaries };
    });
  },

  invalidate: (conversationId) => {
    set((state) => {
      const newSummaries = new Map(state.summaries);
      newSummaries.delete(conversationId);
      return { summaries: newSummaries };
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

  isLoading: (conversationId) => {
    return get().loadingByConversation.get(conversationId) || false;
  },

  getError: (conversationId) => {
    return get().errorByConversation.get(conversationId) ?? null;
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => {
      const newSummaries = new Map(state.summaries);
      let changed = false;
      for (const [key, value] of newSummaries.entries()) {
        if (now - value.cachedAt > SUMMARY_CACHE_TTL) {
          newSummaries.delete(key);
          changed = true;
        }
      }
      return changed ? { summaries: newSummaries } : state;
    });
  },
}));
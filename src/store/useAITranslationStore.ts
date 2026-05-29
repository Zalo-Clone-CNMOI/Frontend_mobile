import { create } from 'zustand';

const TRANSLATION_CACHE_TTL = 24 * 60 * 60 * 1000;

interface TranslationCache {
  original: string;
  translated: string;
  cachedAt: number;
}

const cacheKey = (messageId: string, targetLang: string) => `${messageId}_${targetLang}`;

interface AITranslationState {
  cache: Map<string, TranslationCache>;
  loadingByMessage: Map<string, boolean>;
  errorByMessage: Map<string, string | null>;

  getTranslation(messageId: string, targetLang: string): { original: string; translated: string } | null;
  setTranslation(messageId: string, targetLang: string, original: string, translated: string): void;
  clearExpired(): void;

  setLoading(messageId: string, targetLang: string, loading: boolean): void;
  setError(messageId: string, targetLang: string, error: string | null): void;
  isLoading(messageId: string, targetLang: string): boolean;
  getError(messageId: string, targetLang: string): string | null;
}

export const useAITranslationStore = create<AITranslationState>((set, get) => ({
  cache: new Map(),
  loadingByMessage: new Map(),
  errorByMessage: new Map(),

  getTranslation: (messageId, targetLang) => {
    const key = cacheKey(messageId, targetLang);
    const cached = get().cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.cachedAt > TRANSLATION_CACHE_TTL) {
      const newCache = new Map(get().cache);
      newCache.delete(key);
      set({ cache: newCache });
      return null;
    }

    return { original: cached.original, translated: cached.translated };
  },

  setTranslation: (messageId, targetLang, original, translated) => {
    const key = cacheKey(messageId, targetLang);
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(key, {
        original,
        translated,
        cachedAt: Date.now(),
      });
      // A successful result resolves any in-flight loading/error for this key.
      const newLoading = new Map(state.loadingByMessage);
      newLoading.delete(key);
      const newError = new Map(state.errorByMessage);
      newError.delete(key);
      return { cache: newCache, loadingByMessage: newLoading, errorByMessage: newError };
    });
  },

  setLoading: (messageId, targetLang, loading) => {
    const key = cacheKey(messageId, targetLang);
    set((state) => {
      const newLoading = new Map(state.loadingByMessage);
      if (loading) {
        newLoading.set(key, true);
      } else {
        newLoading.delete(key);
      }
      return { loadingByMessage: newLoading };
    });
  },

  setError: (messageId, targetLang, error) => {
    const key = cacheKey(messageId, targetLang);
    set((state) => {
      const newError = new Map(state.errorByMessage);
      if (error) {
        newError.set(key, error);
      } else {
        newError.delete(key);
      }
      return { errorByMessage: newError };
    });
  },

  isLoading: (messageId, targetLang) => {
    return get().loadingByMessage.get(cacheKey(messageId, targetLang)) || false;
  },

  getError: (messageId, targetLang) => {
    return get().errorByMessage.get(cacheKey(messageId, targetLang)) ?? null;
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => {
      const newCache = new Map(state.cache);
      let changed = false;
      for (const [key, value] of newCache.entries()) {
        if (now - value.cachedAt > TRANSLATION_CACHE_TTL) {
          newCache.delete(key);
          changed = true;
        }
      }
      return changed ? { cache: newCache } : state;
    });
  },
}));
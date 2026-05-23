import { create } from 'zustand';

const TRANSLATION_CACHE_TTL = 24 * 60 * 60 * 1000;

interface TranslationCache {
  original: string;
  translated: string;
  cachedAt: number;
}

interface AITranslationState {
  cache: Map<string, TranslationCache>;

  getTranslation(messageId: string, targetLang: string): { original: string; translated: string } | null;
  setTranslation(messageId: string, targetLang: string, original: string, translated: string): void;
  clearExpired(): void;
}

export const useAITranslationStore = create<AITranslationState>((set, get) => ({
  cache: new Map(),

  getTranslation: (messageId, targetLang) => {
    const key = `${messageId}_${targetLang}`;
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
    const key = `${messageId}_${targetLang}`;
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(key, {
        original,
        translated,
        cachedAt: Date.now(),
      });
      return { cache: newCache };
    });
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
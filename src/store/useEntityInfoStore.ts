import { create } from 'zustand';
import type {
  EntityInfoLang,
  EntityInfoResponse,
  EntityType,
} from '@/src/services/ai/entityInfo.types';

// Mirror the BFF's 7-day server cache so we don't refetch within the window.
export const ENTITY_INFO_TTL = 7 * 24 * 60 * 60 * 1000;

export const entityInfoKey = (type: EntityType, text: string, lang: EntityInfoLang) =>
  `${type}:${text}:${lang}`;

interface EntityInfoCacheEntry {
  data: EntityInfoResponse;
  cachedAt: number;
}

interface EntityInfoState {
  cache: Map<string, EntityInfoCacheEntry>;
  loadingByKey: Map<string, boolean>;
  errorByKey: Map<string, string | null>;

  get(key: string): EntityInfoResponse | null;
  set(key: string, data: EntityInfoResponse): void;
  isLoading(key: string): boolean;
  getError(key: string): string | null;
  setLoading(key: string, loading: boolean): void;
  setError(key: string, error: string | null): void;
}

export const useEntityInfoStore = create<EntityInfoState>((set, get) => ({
  cache: new Map(),
  loadingByKey: new Map(),
  errorByKey: new Map(),

  // Pure read (no delete-on-expiry) so it is safe to call inside selectors.
  get: (key) => {
    const entry = get().cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > ENTITY_INFO_TTL) return null;
    return entry.data;
  },

  set: (key, data) => {
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(key, { data, cachedAt: Date.now() });
      // A successful result resolves any in-flight loading/error for this key.
      const newLoading = new Map(state.loadingByKey);
      newLoading.delete(key);
      const newError = new Map(state.errorByKey);
      newError.delete(key);
      return { cache: newCache, loadingByKey: newLoading, errorByKey: newError };
    });
  },

  isLoading: (key) => get().loadingByKey.get(key) || false,
  getError: (key) => get().errorByKey.get(key) ?? null,

  setLoading: (key, loading) => {
    set((state) => {
      const newLoading = new Map(state.loadingByKey);
      if (loading) {
        newLoading.set(key, true);
      } else {
        newLoading.delete(key);
      }
      return { loadingByKey: newLoading };
    });
  },

  setError: (key, error) => {
    set((state) => {
      const newError = new Map(state.errorByKey);
      if (error) {
        newError.set(key, error);
      } else {
        newError.delete(key);
      }
      return { errorByKey: newError };
    });
  },
}));

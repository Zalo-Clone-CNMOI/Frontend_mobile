import { create } from 'zustand';
import * as usersApi from '../services/usersApi';
import { SearchResult } from '../types/search';
import { getErrorMessage } from '../utils/networkUtils';

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestSearchRequestId = 0;

interface SearchState {
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  searchV2: any;
  filteredResultsV2: any[];
  query: string;
  loading: boolean;
  error: string | null;

  initializeSearchData: () => void;
  setQuery: (query: string) => void;
  performSearch: (query: string, page?: number, limit?: number) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  allResults: [],
  filteredResults: [],
  searchV2: { users: [], conversations: [] },
  filteredResultsV2: [],
  query: '',
  loading: false,
  error: null,

  initializeSearchData: () => {
    set({
      searchV2: { users: [], conversations: [] },
      filteredResultsV2: [],
      allResults: [],
      filteredResults: [],
    });
  },

  performSearch: async (query: string, page = 1, limit = 10) => {
    const requestId = ++latestSearchRequestId;
    const trimmed = query.trim();

    if (!trimmed) {
      set({ filteredResultsV2: [], loading: false, error: null });
      return;
    }

    if (typeof trimmed !== 'string') {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must be text' });
      return;
    }

    if (trimmed.length < 2) {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must be at least 2 characters' });
      return;
    }

    if (trimmed.length > 50) {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must not exceed 50 characters' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const res: any = await usersApi.searchUsers(trimmed, { page, limit });
      if (requestId !== latestSearchRequestId) return;

      const payload = res?.data ?? res;
      let users: any[] = [];

      if (Array.isArray(payload)) {
        users = payload;
      } else if (payload && Array.isArray(payload.data)) {
        users = payload.data;
      }

      const mapped = users.map((u: any) => ({
        type: 'user',
        id: u.id,
        fullName: u.fullName || u.name || '',
        avatarUrl: u.avatarUrl || (u.avatar && u.avatar.url) || null,
        phone: u.phone,
        friendshipStatus: u.friendshipStatus || 'none',
      }));

      const current = get().searchV2 || { users: [], conversations: [] };
      const conversations = current.conversations || [];

      set({
        searchV2: { users: mapped, conversations },
        filteredResultsV2: [...mapped, ...conversations],
        loading: false,
        error: null,
      });
    } catch (e: any) {
      if (requestId !== latestSearchRequestId) return;

      set({
        filteredResultsV2: [],
        loading: false,
        error: getErrorMessage(e),
      });
    }
  },

  setQuery: (query: string) => {
    set({ query, error: null });

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
      const current = get().query || '';
      if (current.trim()) {
        get().performSearch(current.trim());
      } else {
        set({ filteredResultsV2: [], loading: false, error: null });
      }
    }, 350);
  },
}));

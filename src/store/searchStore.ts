import { create } from 'zustand';
import * as usersApi from '../services/usersApi';
import { SearchResult } from '../types/search';
import { getErrorMessage } from '../utils/networkUtils';
import { normalizeVietnamesePhoneNumber } from '../validators/phoneValidator';

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
  currentPage: number;
  hasNext: boolean;

  initializeSearchData: () => void;
  setQuery: (query: string) => void;
  performSearch: (query: string, page?: number, limit?: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  allResults: [],
  filteredResults: [],
  searchV2: { users: [], conversations: [] },
  filteredResultsV2: [],
  query: '',
  loading: false,
  error: null,
  currentPage: 1,
  hasNext: false,

  initializeSearchData: () => {
    set({
      searchV2: { users: [], conversations: [] },
      filteredResultsV2: [],
      allResults: [],
      filteredResults: [],
      currentPage: 1,
      hasNext: false,
    });
  },

  performSearch: async (query: string, page = 1, limit = 20) => {
    const requestId = ++latestSearchRequestId;
    const trimmed = query.trim();

    if (!trimmed) {
      set({ filteredResultsV2: [], loading: false, error: null, currentPage: 1, hasNext: false });
      return;
    }

    if (typeof trimmed !== 'string') {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must be text', currentPage: 1, hasNext: false });
      return;
    }

    if (trimmed.length < 2) {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must be at least 2 characters', currentPage: 1, hasNext: false });
      return;
    }

    if (trimmed.length > 50) {
      set({ filteredResultsV2: [], loading: false, error: 'Search query must not exceed 50 characters', currentPage: 1, hasNext: false });
      return;
    }

    set({ loading: true, error: null });

    // Normalize phone number only if it starts with 0 (Vietnamese format)
    // Don't normalize partial digit searches like "943" - let backend handle partial matching
    const searchQuery = trimmed.startsWith('0') && trimmed.length >= 2 
      ? normalizeVietnamesePhoneNumber(trimmed) 
      : trimmed;

    try {
      const res: any = await usersApi.searchUsers(searchQuery, { page, limit });
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
        id: u.id || u._id,
        fullName: u.fullName || u.name || '',
        avatarUrl: u.avatarUrl || (u.avatar && u.avatar.url) || null,
        phone: u.phone,
        friendshipStatus: u.friendshipStatus || 'none',
      }));

      const current = get().searchV2 || { users: [], conversations: [] };
      const conversations = current.conversations || [];
      const existingUsers = page > 1 ? current.users || [] : [];
      const mergedUsers = page > 1 ? [...existingUsers, ...mapped] : mapped;
      const dedupedUsers = Array.from(
        new Map(mergedUsers.map((item: any) => [String(item.id), item])).values(),
      );
      const meta = payload?.meta || {};
      const next =
        Boolean(meta?.hasNext) ||
        (meta?.page && meta?.totalPages ? Number(meta.page) < Number(meta.totalPages) : false);

      set({
        searchV2: { users: dedupedUsers, conversations },
        filteredResultsV2: [...dedupedUsers, ...conversations],
        loading: false,
        error: null,
        currentPage: page,
        hasNext: next,
      });
    } catch (e: any) {
      if (requestId !== latestSearchRequestId) return;

      set({
        filteredResultsV2: [],
        loading: false,
        error: getErrorMessage(e),
        currentPage: page,
        hasNext: false,
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
        get().performSearch(current.trim(), 1, 20);
      } else {
        set({ filteredResultsV2: [], loading: false, error: null, currentPage: 1, hasNext: false });
      }
    }, 350);
  },

  loadMore: async () => {
    const state = get();
    if (state.loading || !state.hasNext) return;
    const trimmed = state.query.trim();
    if (!trimmed || trimmed.length < 2) return;
    await state.performSearch(trimmed, state.currentPage + 1, 20);
  },
}));

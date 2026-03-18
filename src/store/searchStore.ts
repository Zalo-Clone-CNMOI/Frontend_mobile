import { create } from 'zustand';
import * as usersApi from '../services/usersApi';
import { SearchResult } from '../types/search';
import { getErrorMessage } from '../utils/networkUtils';

interface SearchState {
  // State
  // keep legacy for compatibility
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  // v2
  searchV2: any;
  filteredResultsV2: any[];
  query: string;
  loading: boolean;
  error: string | null;
  // debug payload removed

  // Actions
  initializeSearchData: () => void;
  setQuery: (query: string) => void;
  performSearch: (query: string, page?: number, limit?: number) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // State
  allResults: [],
  filteredResults: [],
  searchV2: { users: [], conversations: [] },
  filteredResultsV2: [],
  query: '',
  loading: false,
  error: null,
  // debug payload removed

  // Actions
  initializeSearchData: () => {
    // Initialize with empty v2 payload; UI will call search as user types
    set({
      searchV2: { users: [], conversations: [] },
      filteredResultsV2: [],
      allResults: [],
      filteredResults: [],
    });
  },

  performSearch: async (query: string, page = 1, limit = 10) => {
    const trimmed = query.trim();
    
    // Validate query according to API requirements
    if (!trimmed) {
      set({ 
        filteredResultsV2: [], 
        loading: false, 
        error: 'Search query cannot be empty'
      });
      return;
    }
    
    if (typeof trimmed !== 'string') {
      set({ 
        filteredResultsV2: [], 
        loading: false, 
        error: 'Search query must be text'
      });
      return;
    }
    
    if (trimmed.length < 2) {
      set({ 
        filteredResultsV2: [], 
        loading: false, 
        error: 'Search query must be at least 2 characters'
      });
      return;
    }
    
    if (trimmed.length > 50) {
      set({ 
        filteredResultsV2: [], 
        loading: false, 
        error: 'Search query must not exceed 50 characters'
      });
      return;
    }

    set({ loading: true, error: null });

    try {
      const res: any = await usersApi.searchUsers(trimmed, { page, limit });
      const payload = res?.data ?? res;
      
      console.log('📊 Raw API response:', JSON.stringify(payload, null, 2));
      
      // Handle different response formats:
      // 1. Direct array: [{...}, {...}]
      // 2. Wrapped object: { data: [{...}, {...}] }
      let users = [];
      if (Array.isArray(payload)) {
        // Direct array format
        users = payload;
      } else if (payload && Array.isArray(payload.data)) {
        // Wrapped object format
        users = payload.data;
      }
      
      console.log('👥 Extracted users array:', users);

      // Map API user shape to UI shape (type: 'user')
      const mapped = users.map((u: any) => ({
        // include SearchResult shape
        type: 'user',
        id: u.id,
        fullName: u.fullName || u.name || '',
        avatarUrl: u.avatarUrl || (u.avatar && u.avatar.url) || null,
        phone: u.phone,
        friendshipStatus: u.friendshipStatus || 'none',
      }));
      
      console.log('🔄 Mapped users for UI:', JSON.stringify(mapped, null, 2));

      // Preserve existing conversations in v2 bucket
      const current = get().searchV2 || { users: [], conversations: [] };
      set({ 
        searchV2: { users: mapped, conversations: current.conversations || [] }, 
        filteredResultsV2: [...mapped, ...(current.conversations || [])], 
        loading: false, 
        error: null 
      });

      // Log helpful info for debugging
      console.log(`🔍 Search completed: ${mapped.length} users found for query "${trimmed}"`);
    } catch (e: any) {
      console.warn('performSearch error:', e);
      
      set({ 
        filteredResultsV2: [], 
        loading: false, 
        error: getErrorMessage(e)
      });
    }
  },

  setQuery: (query: string) => {
    set({ query, error: null });

    // Debounce search calls
    // store timer on the module-scoped variable
    // @ts-ignore
    if ((global as any).__searchTimer) {
      // @ts-ignore
      clearTimeout((global as any).__searchTimer);
    }
    // @ts-ignore
    (global as any).__searchTimer = setTimeout(() => {
      const current = get().query || '';
      if (current.trim()) {
        get().performSearch(current.trim());
      } else {
        set({ filteredResultsV2: [], loading: false, error: null });
      }
    }, 350);
  },
}));

import { create } from 'zustand';
import { SEARCH_V2 } from '../data/searchMockData';
import { SearchResult } from '../types/search';

interface SearchState {
  // State
  // keep legacy for compatibility
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  // v2
  searchV2: any;
  filteredResultsV2: any[];
  query: string;

  // Actions
  initializeSearchData: () => void;
  setQuery: (query: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  // State
  allResults: [],
  filteredResults: [],
  searchV2: { users: [], conversations: [] },
  filteredResultsV2: [],
  query: '',

  // Actions
  initializeSearchData: () => {
    // Expose v2 search payload directly and keep legacy results for fallback
    set({
      searchV2: SEARCH_V2,
      filteredResultsV2: [
        ...(Array.isArray(SEARCH_V2.users) ? SEARCH_V2.users : []),
        ...(Array.isArray(SEARCH_V2.conversations) ? SEARCH_V2.conversations : []),
      ],
      allResults: [],
      filteredResults: [],
    });
  },

  setQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();

      // filter v2 results (users + conversations)
      const v2base = state.searchV2 || { users: [], conversations: [] };
      const v2items = [
        ...(Array.isArray(v2base.users) ? v2base.users : []),
        ...(Array.isArray(v2base.conversations) ? v2base.conversations : []),
      ];

      const filteredV2 = trimmedQuery
        ? v2items.filter((it: any) => {
            const name = it.type === 'user' ? it.fullName : it.name || '';
            return name.toLowerCase().includes(trimmedQuery);
          })
        : v2items;

      // legacy filtering (keep behavior)
      const legacyFiltered = trimmedQuery
        ? state.allResults.filter((result) => result.name.toLowerCase().includes(trimmedQuery))
        : state.allResults;

      return {
        query,
        filteredResults: legacyFiltered,
        filteredResultsV2: filteredV2,
      };
    });
  },
}));

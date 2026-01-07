import { create } from 'zustand';
import { SearchResult } from '../types/search';
import { SEARCH_MOCK_DATA } from '../data/searchMockData';

interface SearchState {
  // State
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  query: string;

  // Actions
  initializeSearchData: () => void;
  setQuery: (query: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  // State
  allResults: [],
  filteredResults: [],
  query: '',

  // Actions
  initializeSearchData: () => {
    set({
      allResults: SEARCH_MOCK_DATA,
      filteredResults: SEARCH_MOCK_DATA,
    });
  },

  setQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();
      const filtered = trimmedQuery
        ? state.allResults.filter((result) =>
            result.name.toLowerCase().includes(trimmedQuery)
          )
        : state.allResults;

      return {
        query,
        filteredResults: filtered,
      };
    });
  },
}));

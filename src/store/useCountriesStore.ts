import { create } from 'zustand';
import { Country } from '../data/countriesMockData';
import { COUNTRIES_MOCK_DATA } from '../data/countriesMockData';

interface CountriesState {
  // State
  countries: Country[];
  filteredCountries: Country[];
  searchQuery: string;

  // Actions
  initializeCountries: () => void;
  setSearchQuery: (query: string) => void;
  getFilteredCountries: () => Country[];
}

export const useCountriesStore = create<CountriesState>((set, get) => ({
  // State
  countries: [],
  filteredCountries: [],
  searchQuery: '',

  // Actions
  initializeCountries: () => {
    set({
      countries: COUNTRIES_MOCK_DATA,
      filteredCountries: COUNTRIES_MOCK_DATA,
    });
  },

  setSearchQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();
      const filtered = trimmedQuery
        ? state.countries.filter(
            (c) =>
              c.name.toLowerCase().includes(trimmedQuery) ||
              c.code.includes(trimmedQuery)
          )
        : state.countries;

      return {
        searchQuery: query,
        filteredCountries: filtered,
      };
    });
  },

  getFilteredCountries: () => {
    return get().filteredCountries;
  },
}));

import { create } from 'zustand';
import { Country , COUNTRIES_MOCK_DATA } from '../data/countriesMockData';


interface CountriesState {
  countries: Country[];
  filteredCountries: Country[];
  searchQuery: string;

  initializeCountries: () => void;
  setSearchQuery: (query: string) => void;
  getFilteredCountries: () => Country[];
}

export const useCountriesStore = create<CountriesState>((set, get) => ({
  countries: [],
  filteredCountries: [],
  searchQuery: '',

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

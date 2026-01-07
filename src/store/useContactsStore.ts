import { create } from 'zustand';
import { Contact, FRIENDS_MOCK_DATA, GROUPS_MOCK_DATA, OA_MOCK_DATA } from '../data/contactsMockData';

interface ContactsState {
  // State
  friends: Contact[];
  groups: Contact[];
  oas: Contact[];
  activeTab: 0 | 1 | 2; // 0: friends, 1: groups, 2: oas
  filterType: 'all' | 'recent';
  searchQuery: string;

  // Computed
  currentData: Contact[];
  filteredData: Contact[];

  // Actions
  initializeContacts: () => void;
  setActiveTab: (tab: 0 | 1 | 2) => void;
  setFilterType: (filter: 'all' | 'recent') => void;
  setSearchQuery: (query: string) => void;
  addFriend: (friend: Contact) => void;
  deleteFriend: (friendId: string) => void;
  addGroup: (group: Contact) => void;
  deleteGroup: (groupId: string) => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  // State
  friends: [],
  groups: [],
  oas: [],
  activeTab: 0,
  filterType: 'all',
  searchQuery: '',
  currentData: [],
  filteredData: [],

  // Actions
  initializeContacts: () => {
    set({
      friends: FRIENDS_MOCK_DATA,
      groups: GROUPS_MOCK_DATA,
      oas: OA_MOCK_DATA,
    });
    get().setActiveTab(0); // Trigger re-computation
  },

  setActiveTab: (tab: 0 | 1 | 2) => {
    set((state) => {
      let baseData = tab === 0 ? state.friends : tab === 1 ? state.groups : state.oas;

      // Apply filter
      if (tab === 0 && state.filterType === 'recent') {
        baseData = baseData.filter(
          (item) =>
            item.subtitle === 'Vừa truy cập' || item.subtitle === 'Đang hoạt động'
        );
      }

      // Apply search
      let filtered = baseData;
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.trim().toLowerCase();
        filtered = baseData.filter((item) => item.name.toLowerCase().includes(query));
      }

      return {
        activeTab: tab,
        currentData: baseData,
        filteredData: filtered,
      };
    });
  },

  setFilterType: (filter: 'all' | 'recent') => {
    set((state) => {
      const currentState = get();
      let baseData =
        state.activeTab === 0
          ? state.friends
          : state.activeTab === 1
            ? state.groups
            : state.oas;

      if (state.activeTab === 0 && filter === 'recent') {
        baseData = baseData.filter(
          (item) =>
            item.subtitle === 'Vừa truy cập' || item.subtitle === 'Đang hoạt động'
        );
      }

      return {
        filterType: filter,
        currentData: baseData,
        filteredData: baseData,
      };
    });
  },

  setSearchQuery: (query: string) => {
    set((state) => {
      const trimmedQuery = query.trim().toLowerCase();
      const filtered = trimmedQuery
        ? state.currentData.filter((item) =>
            item.name.toLowerCase().includes(trimmedQuery)
          )
        : state.currentData;

      return {
        searchQuery: query,
        filteredData: filtered,
      };
    });
  },

  addFriend: (friend: Contact) => {
    set((state) => ({
      friends: [friend, ...state.friends],
    }));
  },

  deleteFriend: (friendId: string) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
    }));
  },

  addGroup: (group: Contact) => {
    set((state) => ({
      groups: [group, ...state.groups],
    }));
  },

  deleteGroup: (groupId: string) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
  },
}));

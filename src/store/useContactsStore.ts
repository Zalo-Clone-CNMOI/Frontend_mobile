import { create } from 'zustand';
import { fetchContacts } from '../services/chatService';
import { Contact, UserV2 } from '../data/contactsMockData';

interface ContactsState {
  // State
  friends: Contact[];
  groups: Contact[];
  oas: Contact[];
  activeTab: number; // 0: friends, 1: groups, 2: oas
  filterType: 'all' | 'recent';
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Computed
  currentData: Contact[];
  filteredData: Contact[];
  // V2 users (production-like)
  usersV2: UserV2[];
  filteredUsersV2: UserV2[];
  usersFilterType: 'all' | 'recent';

  // Actions
  initializeContacts: () => Promise<void>;
  setActiveTab: (tab: number) => void;
  setSearchQuery: (query: string) => void;
  // V2 actions
  setUsersFilterType: (filter: 'all' | 'recent') => void;
  setUsersSearchQuery: (query: string) => void;
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
  usersV2: [],
  filteredUsersV2: [],
  usersFilterType: 'all',
  isLoading: false,
  error: null,

  // Actions
  initializeContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { users } = await fetchContacts();

      const friends: Contact[] = users
        .filter((u) => u.id !== 'user-me')
        .map((u) => ({
          id: u.id,
          name: u.fullName,
          subtitle: u.status === 'online' ? 'Đang hoạt động' : 'Vừa truy cập',
          avatar: u.avatar || '',
          type: 'friend' as const,
        }));

      set({
        usersV2: users,
        friends,
        groups: [],
        oas: [],
        filteredUsersV2: users.filter((u) => u.id !== 'user-me'),
        isLoading: false,
      });
      get().setActiveTab(0);
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  setActiveTab: (tab: number) => {
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

  // V2: filter users by presence or search
  setUsersFilterType: (filter: 'all' | 'recent') => {
    set((state) => {
      let users = state.usersV2 || [];
      if (filter === 'recent') {
        users = users.filter((u) => u.status === 'online');
      }

      return {
        usersFilterType: filter,
        filteredUsersV2: users.filter((u) => u.id !== 'user-me'),
      };
    });
  },

  setUsersSearchQuery: (query: string) => {
    set((state) => {
      const trimmed = query.trim().toLowerCase();
      const filtered = trimmed
        ? (state.usersV2 || []).filter((u) => u.fullName.toLowerCase().includes(trimmed) && u.id !== 'user-me')
        : (state.usersV2 || []).filter((u) => u.id !== 'user-me');

      return { filteredUsersV2: filtered };
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

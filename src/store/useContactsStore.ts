import { create } from 'zustand';
import { fetchContacts } from '../services/chatService';
import type {
  UserPresence,
  UserV2,
  Contact,
  ContactListItem,
  ContactsState,
  FilterType,
} from '../types/contacts';

const RECENT_SUBTITLES = new Set(['Vua truy cap', 'Dang hoat dong']);

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const buildBaseDataByTab = (tab: number, friends: Contact[], groups: Contact[], oas: Contact[]) =>
  tab === 0 ? friends : tab === 1 ? groups : oas;

const filterContacts = (
  list: Contact[],
  tab: number,
  filterType: 'all' | 'recent',
  searchQuery: string,
) => {
  const normalizedQuery = normalizeText(searchQuery.trim());

  let result = list;
  if (tab === 0 && filterType === 'recent') {
    result = result.filter((item) => RECENT_SUBTITLES.has(normalizeText(item.subtitle || '')));
  }

  if (normalizedQuery) {
    result = result.filter((item) => normalizeText(item.name).includes(normalizedQuery));
  }

  return result;
};

const filterUsers = (users: UserV2[], filterType: 'all' | 'recent', searchQuery: string) => {
  const normalizedQuery = normalizeText(searchQuery.trim());

  let result = users.filter((u) => u.id !== 'user-me');

  if (filterType === 'recent') {
    result = result.filter((u) => u.status === 'online');
  }

  if (normalizedQuery) {
    result = result.filter((u) => normalizeText(u.fullName || '').includes(normalizedQuery));
  }

  return result;
};

const mapUsersToFriends = (users: UserV2[]): Contact[] =>
  users
    .filter((u) => u.id !== 'user-me')
    .map((u) => ({
      id: u.id,
      name: u.fullName,
      subtitle: u.status === 'online' ? 'Dang hoat dong' : 'Vua truy cap',
      avatar: u.avatar || '',
      type: 'friend' as const,
    }));

export const useContactsStore = create<ContactsState>((set, get) => ({
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

  recentContacts: [],
  getRecentContacts: (limit) => {
    const recentContacts = get().recentContacts;
    // Sort by lastInteractionAt descending and apply limit
    const sorted = recentContacts
      .filter((item) => item.lastInteractionAt)
      .sort((a, b) => (b.lastInteractionAt || 0) - (a.lastInteractionAt || 0));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  updateContactInteraction: (contactId, timestamp) => {
    const recentContacts = get().recentContacts;
    const index = recentContacts.findIndex((item) => item.id === contactId);
    const interactionTime = timestamp || Date.now();
    
    if (index !== -1) {
      // Update existing contact
      recentContacts[index] = {
        ...recentContacts[index],
        lastInteractionAt: interactionTime,
      };
      // Move to front
      const updated = [recentContacts[index], ...recentContacts.filter((_, i) => i !== index)];
      set({ recentContacts: updated });
    } else {
      // Add new contact with minimal data
      const newContact: ContactListItem = {
        id: contactId,
        fullName: '',
        avatar: null,
        status: 'offline',
        phone: '',
        email: '',
        bio: '',
        isOnline: false,
        lastInteractionAt: interactionTime,
      };
      set({ recentContacts: [newContact, ...recentContacts] });
    }
  },

  initializeContacts: async () => {
    set({ isLoading: true, error: null });

    try {
      const { users } = await fetchContacts();
      const friends = mapUsersToFriends(users);
      const currentData = buildBaseDataByTab(0, friends, [], []);

      set({
        usersV2: users,
        friends,
        groups: [],
        oas: [],
        activeTab: 0,
        currentData,
        filteredData: filterContacts(currentData, 0, 'all', ''),
        filteredUsersV2: filterUsers(users, 'all', ''),
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  setActiveTab: (tab: number) => {
    set((state) => {
      const currentData = buildBaseDataByTab(tab, state.friends, state.groups, state.oas);
      return {
        activeTab: tab,
        currentData,
        filteredData: filterContacts(currentData, tab, state.filterType, state.searchQuery),
      };
    });
  },

  setFilterType: (filter: 'all' | 'recent') => {
    set((state) => ({
      filterType: filter,
      filteredData: filterContacts(state.currentData, state.activeTab, filter, state.searchQuery),
    }));
  },

  setUsersFilterType: (filter: 'all' | 'recent') => {
    set((state) => ({
      usersFilterType: filter,
      filteredUsersV2: filterUsers(state.usersV2 || [], filter, state.searchQuery),
    }));
  },

  setUsersSearchQuery: (query: string) => {
    set((state) => ({
      searchQuery: query,
      filteredUsersV2: filterUsers(state.usersV2 || [], state.usersFilterType, query),
    }));
  },

  setSearchQuery: (query: string) => {
    set((state) => ({
      searchQuery: query,
      filteredData: filterContacts(state.currentData, state.activeTab, state.filterType, query),
      filteredUsersV2: filterUsers(state.usersV2 || [], state.usersFilterType, query),
    }));
  },

  addFriend: (friend: Contact) => {
    set((state) => {
      const friends = [friend, ...state.friends];
      const currentData =
        state.activeTab === 0
          ? friends
          : buildBaseDataByTab(state.activeTab, friends, state.groups, state.oas);

      return {
        friends,
        currentData,
        filteredData: filterContacts(currentData, state.activeTab, state.filterType, state.searchQuery),
      };
    });
  },

  deleteFriend: (friendId: string) => {
    set((state) => {
      const friends = state.friends.filter((f) => f.id !== friendId);
      const currentData =
        state.activeTab === 0
          ? friends
          : buildBaseDataByTab(state.activeTab, friends, state.groups, state.oas);

      return {
        friends,
        currentData,
        filteredData: filterContacts(currentData, state.activeTab, state.filterType, state.searchQuery),
      };
    });
  },

  addGroup: (group: Contact) => {
    set((state) => {
      const groups = [group, ...state.groups];
      const currentData =
        state.activeTab === 1
          ? groups
          : buildBaseDataByTab(state.activeTab, state.friends, groups, state.oas);

      return {
        groups,
        currentData,
        filteredData: filterContacts(currentData, state.activeTab, state.filterType, state.searchQuery),
      };
    });
  },

  deleteGroup: (groupId: string) => {
    set((state) => {
      const groups = state.groups.filter((g) => g.id !== groupId);
      const currentData =
        state.activeTab === 1
          ? groups
          : buildBaseDataByTab(state.activeTab, state.friends, groups, state.oas);

      return {
        groups,
        currentData,
        filteredData: filterContacts(currentData, state.activeTab, state.filterType, state.searchQuery),
      };
    });
  },
}));

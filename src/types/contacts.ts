// Contact User Presence Status
export type UserPresence = 'online' | 'offline' | 'away';

// Basic Contact User Type
export type ContactUser = {
  id: string;
  fullName: string;
  avatar: string | null;
  status: UserPresence;
  lastSeen: number | null;
};

// Extended User V2 Type (used in contacts store)
export type UserV2 = {
  id: string;
  fullName: string;
  avatar: string | null;
  status?: UserPresence;
  lastSeen?: number | null;
};

// Contact Type (used in UI for tabs)
export type Contact = {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  type: 'friend' | 'group' | 'oa';
};

// Contact List Item Type (used in contacts screen)
export type ContactListItem = {
  id: string;
  fullName: string;
  avatar: string | null;
  status: string;
  phone: string;
  email: string;
  bio: string;
  isOnline: boolean;
  lastSeenAt?: string;
  friendsSince?: string;
  mutualFriends?: number;
  friendType?: string;
  friendStatus?: string;
  friendCategory?: string;
  friendRequestStatus?: string;
  friendRequestSent?: boolean;
  friendRequestReceived?: boolean;
  friendRequestMessage?: string;
  // Recent contacts tracking
  lastInteractionAt?: number;
  lastMessageAt?: number;
  unreadCount?: number;
};

// Filter Types
export type FilterType = 'all' | 'recent';

// Tab Props (used in UI components)
export type TabProps = {
  tabs: string[];
  showFilter?: boolean;
};

// Contacts State Interface (for Zustand store)
export interface ContactsState {
  friends: Contact[];
  groups: Contact[];
  oas: Contact[];
  activeTab: number;
  filterType: FilterType;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  currentData: Contact[];
  filteredData: Contact[];
  usersV2: UserV2[];
  filteredUsersV2: UserV2[];
  usersFilterType: FilterType;

  // Recent contacts tracking
  recentContacts: ContactListItem[];
  getRecentContacts: (limit?: number) => ContactListItem[];
  updateContactInteraction: (contactId: string, timestamp?: number) => void;

  initializeContacts: () => Promise<void>;
  setActiveTab: (tab: number) => void;
  setFilterType: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  setUsersFilterType: (filter: FilterType) => void;
  setUsersSearchQuery: (query: string) => void;
  addFriend: (friend: Contact) => void;
  deleteFriend: (friendId: string) => void;
  addGroup: (group: Contact) => void;
  deleteGroup: (groupId: string) => void;
}
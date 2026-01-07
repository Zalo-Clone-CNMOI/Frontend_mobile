import { create } from 'zustand';
import { UserProfile } from '../data/profileMockData';
import { PROFILE_MOCK_DATA } from '../data/profileMockData';

interface ProfileState {
  // State
  profile: UserProfile | null;

  // Actions
  initializeProfile: () => void;
  getProfile: () => UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  // State
  profile: null,

  // Actions
  initializeProfile: () => {
    set({
      profile: PROFILE_MOCK_DATA,
    });
  },

  getProfile: () => {
    return get().profile;
  },

  updateProfile: (updates: Partial<UserProfile>) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));
  },
}));

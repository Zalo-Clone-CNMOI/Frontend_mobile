import { create } from 'zustand';
import { PROFILE_V2, UserProfile } from '../data/profileMockData';

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
    // Prefer v2 profile if available
    if (PROFILE_V2) {
      set({
        profile: {
          id: PROFILE_V2.id,
          name: PROFILE_V2.fullName,
          avatar: PROFILE_V2.avatar || '',
          subtitle: 'Chạm để xem hồ sơ',
        },
      });
      return;
    }
    set({ profile: null });
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

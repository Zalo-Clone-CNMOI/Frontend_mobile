import { create } from 'zustand';
import { PROFILE_V2, UserProfile } from '../data/profileMockData';

interface ProfileState {
  profile: UserProfile | null;

  initializeProfile: () => void;
  getProfile: () => UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,

  initializeProfile: () => {
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

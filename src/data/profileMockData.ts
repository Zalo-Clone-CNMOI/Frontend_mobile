export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  subtitle: string;
}

// Legacy PROFILE_MOCK_DATA removed — use `PROFILE_V2`.

// Zalo v2 profile for current user (production-like)
export interface ProfileV2 {
  id: string;
  fullName: string;
  avatar?: string;
  status?: 'online' | 'offline';
  lastSeen?: number;
  about?: string;
}

export const PROFILE_V2: ProfileV2 = {
  id: 'user-me',
  fullName: 'Bạn (Me)',
  avatar: 'https://i.pravatar.cc/200?u=user-me',
  status: 'online',
  lastSeen: Date.now(),
  about: 'Đang thử nghiệm UI chat - mock data local',
};

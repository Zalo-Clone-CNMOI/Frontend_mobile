export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  subtitle: string;
}

export const PROFILE_MOCK_DATA: UserProfile = {
  id: 'user-me',
  name: 'Người dùng Zalo',
  avatar: 'https://i.pravatar.cc/200?u=my-profile',
  subtitle: 'Chạm để xem hồ sơ',
};

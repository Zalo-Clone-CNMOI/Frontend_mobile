import { Contact, UserV2, USERS_V2 } from './contactsMockData';

export const CREATE_GROUP_FRIENDS_MOCK_DATA: Contact[] = USERS_V2.map((u: UserV2) => ({
  id: u.id,
  name: u.fullName,
  subtitle: '',
  avatar: u.avatar || '',
  type: 'friend',
}));

export interface CreateGroupUser {
  userId: string;
  fullName: string;
  avatar?: string;
  selected?: boolean;
  role?: 'member' | 'admin' | 'owner';
}

export const CREATE_GROUP_V2_USERS: CreateGroupUser[] = [
  { userId: 'u1', fullName: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=u1', selected: false, role: 'member' },
  { userId: 'u2', fullName: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?u=u2', selected: false, role: 'member' },
  { userId: 'u3', fullName: 'Lê Công', avatar: 'https://i.pravatar.cc/150?u=u3', selected: false, role: 'member' },
  { userId: 'u4', fullName: 'Phạm D', avatar: 'https://i.pravatar.cc/150?u=u4', selected: false, role: 'member' },
];

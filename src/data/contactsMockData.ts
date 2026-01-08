export type ContactType = 'friend' | 'group' | 'oa';

export interface Contact {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  type: ContactType;
  // optional UI helper fields used in some components
  color?: string;
  time?: string;
}

// Legacy per-type mock arrays removed. Use `USERS_V2` for production-like data.

// Zalo v2 user model for production-like data. This can be switched to Firebase later.
export type PresenceStatus = 'online' | 'offline';

export interface UserV2 {
  id: string;
  fullName: string;
  avatar?: string;
  status: PresenceStatus;
  lastSeen?: number;
}

export const USERS_V2: UserV2[] = [
  { id: 'user-me', fullName: 'Bạn (Me)', avatar: 'https://i.pravatar.cc/150?u=user-me', status: 'online', lastSeen: Date.now() },
  { id: 'u1', fullName: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=u1', status: 'online', lastSeen: Date.now() - 1000 * 60 * 5 },
  { id: 'u2', fullName: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?u=u2', status: 'offline', lastSeen: Date.now() - 1000 * 60 * 60 },
  { id: 'u3', fullName: 'Lê Công', avatar: 'https://i.pravatar.cc/150?u=u3', status: 'online', lastSeen: Date.now() - 1000 * 30 },
  { id: 'u4', fullName: 'Phạm D', avatar: 'https://i.pravatar.cc/150?u=u4', status: 'offline', lastSeen: Date.now() - 1000 * 60 * 60 * 24 },
  { id: 'u5', fullName: 'Hoàng E', avatar: 'https://i.pravatar.cc/150?u=u5', status: 'offline', lastSeen: Date.now() - 1000 * 60 * 60 * 48 },
];

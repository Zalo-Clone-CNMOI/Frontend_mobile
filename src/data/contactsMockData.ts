export type ContactType = 'friend' | 'group' | 'oa';

export interface Contact {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  type: ContactType;
  color?: string;
  time?: string;
}

export type PresenceStatus = 'online' | 'offline';

export interface UserV2 {
  id: string;
  fullName: string;
  avatar?: string;
  status: PresenceStatus;
  lastSeen?: number;
}

/**
 * Users derived from ChatMessageSendCommand mock data:
 *   user-me  ← sender_id "user_123"
 *   u6       ← sender_id "user_456"  (Minh Tú  – peer trong conv_001)
 *   u7       ← sender_id "user_999"  (Quang Huy – peer trong conv_002)
 */
export const USERS_V2: UserV2[] = [
  {
    id: 'user-me',
    fullName: 'Bạn (Me)',
    avatar: 'https://i.pravatar.cc/150?u=user-me',
    status: 'online',
    lastSeen: Date.now(),
  },
  {
    id: 'u6',
    fullName: 'Minh Tú',
    avatar: 'https://i.pravatar.cc/150?u=u6',
    status: 'online',
    lastSeen: Date.now() - 1000 * 60 * 3,
  },
  {
    id: 'u7',
    fullName: 'Quang Huy',
    avatar: 'https://i.pravatar.cc/150?u=u7',
    status: 'offline',
    lastSeen: Date.now() - 1000 * 60 * 15,
  },
];

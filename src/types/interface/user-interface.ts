import type { ID } from '../dto/ApiDTO';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export interface User {
  id: string;
  userId?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar: string | null;
  avatarUrl?: string | null;
  status?: string;
  lastSeen?: string | number | null;
  phone?: string;
  email?: string;
  bio?: string;
  gender?: Gender | string;
  dateOfBirth?: string;
}

export interface ContactUser {
  id: string;
  fullName: string;
  avatar: string | null;
  status?: string;
  lastSeen?: number | null;
}

export interface EditProfileForm {
  fullName: string;
  bio: string;
  gender: Gender | string;
  dateOfBirth: string;
  phone: string;
}

export interface UpdateMyProfilePayload {
  fullName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | string;
  email?: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline';
  lastSeenAt?: number;
  expiresAt?: number;
  socketCount?: number;
}

export interface UserSettings {
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

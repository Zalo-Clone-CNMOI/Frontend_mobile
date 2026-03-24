import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';
import api from './http';

export const getProfile = () => api.get('/api/users/me');
export const updateProfile = (payload: any) => api.patch('/api/users/me', payload);

export type SearchUserDTO = {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string | { url?: string };
  phone?: string;
  friendshipStatus?: string;
};

export type SearchUsersResponse = {
  success?: boolean;
  data?: SearchUserDTO[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  timestamp?: string;
};

// Search users through BFF endpoint only (no fallback).
export const searchUsers = async (query: string, params?: any) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { data: [], message: 'Search query cannot be empty', error: 'q should not be empty' };
  }

  if (typeof trimmedQuery !== 'string') {
    return { data: [], message: 'Search query must be text', error: 'q must be a string' };
  }

  if (trimmedQuery.length < 2) {
    return { data: [], message: 'Search query must be at least 2 characters', error: 'Bad Request' };
  }

  if (trimmedQuery.length > 50) {
    return { data: [], message: 'Search query must not exceed 50 characters', error: 'Bad Request' };
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('q', trimmedQuery);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      searchParams.set(k, String(v));
    });
    const url = `${NETWORK_CONFIG.API_BASE_URL}/users/search?${searchParams.toString()}`;
    const response = await apiCallWithRefresh(url, { method: 'GET' });
    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text || null;
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return payload;
  } catch (e: any) {
    console.warn('usersApi.searchUsers failed:', e?.message || e);
    throw e;
  }
};

export default {
  getProfile,
  updateProfile,
  searchUsers,
};

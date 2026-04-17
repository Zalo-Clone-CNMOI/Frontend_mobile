import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';
import api from './http';

// Get current user profile
export const getProfile = () => api.get('/api/users/me');

// Get user profile by ID
// Fetches user info from backend API, extracts data field from response
export const getUserProfile = async (userId: string) => {
  const url = `${NETWORK_CONFIG.API_BASE_URL}/users/${userId}`;
  const response = await apiCallWithRefresh(url, {
    method: 'GET',
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Get profile failed (${response.status})`);
  }

  return data?.data || data;
};

// Update current user profile
// Sends PATCH request with updated profile data
export const updateProfile = async (payload: any) => {
  const url = `${NETWORK_CONFIG.API_BASE_URL}/users/me`;
  const response = await apiCallWithRefresh(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Update failed (${response.status})`);
  }

  return { data, status: response.status };
};

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
};

export default {
  getProfile,
  updateProfile,
  searchUsers,
  getUserProfile,
};

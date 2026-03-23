import { getCurrentToken } from './authService';
import api from './http';

export const getProfile = () => api.get('/api/users/me');
export const updateProfile = (payload: any) => api.patch('/api/users/me', payload);

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
    await getCurrentToken();

    const resp = await api.get('/api/users/search', {
      params: { q: trimmedQuery, ...params },
      timeout: 10000,
    });

    return resp?.data ?? resp;
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

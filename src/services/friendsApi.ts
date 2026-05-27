import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

type FriendsListParams = {
  page?: number;
  limit?: number;
};

const toQueryString = (params?: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const str = query.toString();
  return str ? `?${str}` : '';
};

const request = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}${path}`, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return { data, status: response.status };
};

export const getFriends = async (params?: FriendsListParams) => {
  return request('GET', `/friends${toQueryString(params)}`);
};

export const removeFriend = (friendId: string) =>
  request('DELETE', `/friends/${encodeURIComponent(friendId)}`);

export default {
  getFriends,
  removeFriend,
};

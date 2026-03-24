import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

export type FriendsListParams = {
  page?: number;
  limit?: number;
};

export type FriendDTO = {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  bio?: string;
  status?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  lastSeen?: string | number;
  friendsSince?: string;
  mutualFriends?: number;
  friendType?: string;
  friendStatus?: string;
  friendCategory?: string;
  friendRequestStatus?: string;
  friendRequestSent?: boolean;
  friendRequestReceived?: boolean;
  friendRequestMessage?: string;
};

export type FriendsListResponse = {
  success?: boolean;
  data?: FriendDTO[];
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

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

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

export const getFriendsList = async (params?: FriendsListParams) => {
  const response = await request('GET', `/friends${toQueryString(params)}`);
  return response as { data: FriendsListResponse; status: number };
};

export const getPendingRequests = (params?: any) =>
  request('GET', `/friends/requests/pending${toQueryString(params)}`);

export const getSentRequests = (params?: any) =>
  request('GET', `/friends/requests/sent${toQueryString(params)}`);

export const sendFriendRequest = (payload: any) =>
  request('POST', '/friends/requests', payload);

export const updateFriendRequest = (requestId: string, payload: any) =>
  request('PATCH', `/friends/requests/${encodeURIComponent(requestId)}`, payload);

export const deleteFriendRequest = (requestId: string) =>
  request('DELETE', `/friends/requests/${encodeURIComponent(requestId)}`);

export const blockUser = (payload: any) =>
  request('POST', '/friends/block', payload);

export default {
  getFriends,
  getFriendsList,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  updateFriendRequest,
  deleteFriendRequest,
  blockUser,
};

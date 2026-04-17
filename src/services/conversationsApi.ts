import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

// Convert params object to query string
const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

// Make HTTP request with auth refresh
// Handles GET, POST, PATCH, DELETE methods, parses JSON response
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
    const errorMessage =
      data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return { data, status: response.status };
};

// Get conversations list with pagination
export const getConversations = async (params?: { page?: number; limit?: number }) => {
  const page = Number(params?.page || 1);
  const limit = Number(params?.limit || 50);
  const path = `/conversations${toQueryString({ page, limit })}`;
  return request('GET', path);
};

// Get conversation detail by ID
export const getConversationDetail = async (conversationId: string) =>
  request('GET', `/conversations/${encodeURIComponent(conversationId)}`);

// Create new group conversation
export const createGroup = async (payload: any) => {
  return request('POST', '/conversations/group', payload);
};

// Create direct conversation with user
export const createDirect = async (participantId: string) => {
  return request('POST', '/conversations/direct', { participantId });
};

// Get members of a conversation
export const getConversationMembers = async (conversationId: string) =>
  request('GET', `/conversations/${encodeURIComponent(conversationId)}/members`);

// Add members to a group conversation
export const addMember = (conversationId: string, payload: any) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/members`, payload);

// Update member role/permissions in conversation
export const updateMember = (
  conversationId: string,
  memberId: string,
  payload: any,
) =>
  request(
    'PATCH',
    `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,
    payload,
  );

// Remove member from conversation
export const removeMember = (conversationId: string, memberId: string) =>
  request(
    'DELETE',
    `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,
  );

// Leave a conversation
export const leaveConversation = (conversationId: string) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/leave`);

// Mark conversation as read
export const markAsRead = (conversationId: string, payload?: any) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/read`, payload || {});

export default {
  getConversations,
  getConversationMembers,
  createGroup,
  createDirect,
  addMember,
  updateMember,
  removeMember,
  leaveConversation,
  markAsRead,
};

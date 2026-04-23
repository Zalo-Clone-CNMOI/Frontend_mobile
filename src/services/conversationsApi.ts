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
    // Handle error message - could be string or object
    let errorMessage = data?.message || data?.error || `Request failed (${response.status})`;

    // If message is an object, stringify it
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }


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
  try {
    const result = await request('POST', '/conversations/group', payload);
    return result;
  } catch (error: any) {
    // Re-throw with better error info
    throw error;
  }
};

// Create direct conversation with user
export const createDirect = async (participantId: string) => {
  return request('POST', '/conversations/direct', { participantId });
};


// Add members to a group conversation
export const addMember = (
  conversationId: string,
  payload: { memberIds: string[] },
) => {
  // Client-side validation
  if (!payload.memberIds || !Array.isArray(payload.memberIds)) {
    const error = new Error('memberIds must be an array');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  if (payload.memberIds.length === 0) {
    const error = new Error('At least 1 member is required');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  if (payload.memberIds.length > 50) {
    const error = new Error('Maximum 50 members can be added at once');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  // Validate UUID format for each member ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const memberId of payload.memberIds) {
    if (!uuidRegex.test(memberId)) {
      const error = new Error(`Invalid UUID format for member: ${memberId}`);
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }
  }

  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/members`, payload);
};

// Update member role/permissions in conversation
export const updateMember = (
  conversationId: string,
  memberId: string,
  payload: { role: 'owner' | 'admin' | 'member' },
) =>
  request(
    'PATCH',
    `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}/role`,
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

// Update my settings for a conversation (notifications, nickname, etc.)
export const updateMySettings = (
  conversationId: string,
  payload: { isMuted?: boolean; isPinned?: boolean; nickname?: string },
) =>
  request(
    'PATCH',
    `/conversations/${encodeURIComponent(conversationId)}/settings`,
    payload,
  );

// Update conversation (group name, avatar)
export const updateConversation = async (
  conversationId: string,
  payload: { name?: string; avatarUrl?: string },
) => {
  // 1. Validation - Check conversationId
  if (!conversationId || typeof conversationId !== 'string') {
    const error = new Error('Invalid conversation ID');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  // 2. Validation - Check payload is not empty
  if (!payload.name && !payload.avatarUrl) {
    const error = new Error('At least one field (name or avatarUrl) must be provided');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  // 3. Validation - Validate name if provided
  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string') {
      const error = new Error('Name must be a string');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    const trimmedName = payload.name.trim();
    if (trimmedName.length === 0) {
      const error = new Error('Name cannot be empty');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    if (trimmedName.length < 2) {
      const error = new Error('Name must be at least 2 characters');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    if (trimmedName.length > 100) {
      const error = new Error('Name must not exceed 100 characters');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    // Update payload with trimmed name
    payload.name = trimmedName;
  }

  // 4. Validation - Validate avatarUrl if provided
  if (payload.avatarUrl !== undefined) {
    if (typeof payload.avatarUrl !== 'string') {
      const error = new Error('Avatar URL must be a string');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    const trimmedAvatarUrl = payload.avatarUrl.trim();
    if (trimmedAvatarUrl.length > 500) {
      const error = new Error('Avatar URL must not exceed 500 characters');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    // Validate avatarUrl format (S3 key or full URL)
    if (trimmedAvatarUrl.length > 0) {
      // Check if it's a valid S3 key format (public/... or private/...)
      // or a valid HTTP/HTTPS URL
      const isValidS3Key = /^(public|private)\/[-A-Za-z0-9._/]+$/.test(trimmedAvatarUrl);
      const isValidUrl = /^https?:\/\/.+/.test(trimmedAvatarUrl);

      if (!isValidS3Key && !isValidUrl) {
        const error = new Error('Avatar URL must be a valid S3 key (public/... or private/...) or a valid HTTP/HTTPS URL');
        (error as any).code = 'INVALID_INPUT';
        throw error;
      }
    }

    // Update payload with trimmed avatarUrl
    payload.avatarUrl = trimmedAvatarUrl;
  }

  // 5. Authorization check - This should be done on backend, but we can add client-side check as well
  // Note: The actual authorization check should be performed on the backend server
  // Client-side check is only for UI feedback purposes

  // 6. Make the API request
  try {
    const result = await request(
      'PATCH',
      `/conversations/${encodeURIComponent(conversationId)}`,
      payload,
    );
    return result;
  } catch (error: any) {

    // 7. Enhanced error handling
    const statusCode = (error as any).status || 0;

    // Handle specific error cases
    if (statusCode === 403) {
      const enhancedError = new Error('You do not have permission to update this conversation. Only owners can edit group information.');
      (enhancedError as any).code = 'FORBIDDEN';
      (enhancedError as any).status = 403;
      throw enhancedError;
    }

    if (statusCode === 404) {
      const enhancedError = new Error('Conversation not found or has been deleted');
      (enhancedError as any).code = 'NOT_FOUND';
      (enhancedError as any).status = 404;
      throw enhancedError;
    }

    if (statusCode === 409) {
      const enhancedError = new Error('Update conflict. The conversation may have been modified by another user. Please refresh and try again.');
      (enhancedError as any).code = 'CONFLICT';
      (enhancedError as any).status = 409;
      throw enhancedError;
    }

    if (statusCode === 400) {
      // Check if it's the avatar validation error from backend
      if (error.message && error.message.includes('Avatar key must start with public/ or private/')) {
        const enhancedError = new Error('Avatar key must start with public/ or private/ and contain only valid key characters');
        (enhancedError as any).code = 'INVALID_AVATAR_KEY';
        (enhancedError as any).status = 400;
        throw enhancedError;
      }
    }

    // Re-throw original error with additional context
    const enhancedError = new Error(error.message || 'Failed to update conversation');
    (enhancedError as any).code = error.code || 'UPDATE_FAILED';
    (enhancedError as any).status = statusCode;
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
};

// Disband a group conversation
export const disbandConversation = (conversationId: string) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/disband`);

// Send group invites
export const sendInvites = (
  conversationId: string,
  payload: {
    userIds: string[];
    message?: string;
    expiresInHours?: number;
  },
) => {
  // Client-side validation
  if (!payload.userIds || !Array.isArray(payload.userIds)) {
    const error = new Error('userIds must be an array');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  if (payload.userIds.length === 0) {
    const error = new Error('At least 1 user is required');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  if (payload.userIds.length > 50) {
    const error = new Error('Maximum 50 invites at once');
    (error as any).code = 'INVALID_INPUT';
    throw error;
  }

  // Validate UUID format for each user ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const userId of payload.userIds) {
    if (!uuidRegex.test(userId)) {
      const error = new Error(`Invalid UUID format for user: ${userId}`);
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }
  }

  // Validate message length if provided
  if (payload.message !== undefined) {
    if (typeof payload.message !== 'string') {
      const error = new Error('Message must be a string');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    if (payload.message.length > 500) {
      const error = new Error('Message must not exceed 500 characters');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }
  }

  // Validate expiresInHours if provided
  if (payload.expiresInHours !== undefined) {
    if (typeof payload.expiresInHours !== 'number') {
      const error = new Error('expiresInHours must be a number');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }

    if (payload.expiresInHours < 1 || payload.expiresInHours > 168) {
      const error = new Error('expiresInHours must be between 1 and 168 hours (7 days)');
      (error as any).code = 'INVALID_INPUT';
      throw error;
    }
  }

  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites`, payload);
};

// Get pending invites for current user
export const getPendingInvites = (params?: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  sort?: string;
}) => {
  const page = Number(params?.page || 1);
  const limit = Math.min(Number(params?.limit || 20), 50);
  const status = params?.status || 'pending';
  const sort = params?.sort || 'createdAt:desc';
  const path = `/conversations/invites/pending${toQueryString({ page, limit, status, sort })}`;
  return request('GET', path);
};

// Get conversation invites (owner/admin only)
export const getConversationInvites = (
  conversationId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  },
) => {
  const page = Number(params?.page || 1);
  const limit = Math.min(Number(params?.limit || 20), 50);
  const status = params?.status || 'pending';
  const path = `/conversations/${encodeURIComponent(conversationId)}/invites${toQueryString({ page, limit, status })}`;
  return request('GET', path);
};

// Accept a group invite
export const acceptInvite = (conversationId: string, inviteId: string) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/accept`);

// Reject a group invite
export const rejectInvite = (conversationId: string, inviteId: string) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/reject`);

// Cancel a group invite
export const cancelInvite = (conversationId: string, inviteId: string) =>
  request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/cancel`);

export default {
  getConversations,
  getConversationDetail,
  createGroup,
  createDirect,
  addMember,
  updateMember,
  removeMember,
  leaveConversation,
  markAsRead,
  updateMySettings,
  updateConversation,
  disbandConversation,
  sendInvites,
  getPendingInvites,
  getConversationInvites,
  acceptInvite,
  rejectInvite,
  cancelInvite,
};

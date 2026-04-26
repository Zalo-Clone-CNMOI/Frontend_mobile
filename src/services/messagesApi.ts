import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

// Convert params object to query string
const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

// Make HTTP request with auth refresh
// Handles GET, POST, DELETE methods, parses JSON response, throws error on failure
const request = async (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: FormData,
) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}${path}`, {
    method,
    body,
  });

  const text = await response.text();
  let rawData: any = null;
  try {
    rawData = text ? JSON.parse(text) : null;
  } catch {
    rawData = text || null;
  }

  if (!response.ok) {
    const errorMessage =
      rawData?.message || rawData?.error || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  const data = rawData?.data ?? rawData;
  return { data, status: response.status };
};

// Fetch messages for a conversation with pagination
// Returns paginated message list with nextCursor and hasMore flags
export const getMessages = async (
  conversationId: string,
  limit = 50,
  cursor?: string,
) => {
  const normalizedConversationId = String(conversationId || '').trim();
  if (!normalizedConversationId) {
    return { data: { items: [], nextCursor: null, hasMore: false }, status: 200 };
  }

  const path = `/messages/${encodeURIComponent(normalizedConversationId)}${toQueryString({
    limit: Number(limit || 50),
    cursor,
  })}`;
  return request('GET', path);
};

// Fetch detailed message info including attachments and reactions
export const getMessageDetails = async (
  conversationId: string,
  createdAt: string | number,
  messageId: string,
) => {
  const path = `/messages/${encodeURIComponent(conversationId)}/${createdAt}/${encodeURIComponent(messageId)}`;
  return request('GET', path);
};

// Fetch reactions for a specific message
export const getMessageReactions = async (
  messageId: string,
) => {
  const path = `/messages/${encodeURIComponent(messageId)}/reactions`;
  return request('GET', path);
};

// Lookup message by ID only (no conversation needed)
// Used for finding message location when only messageId is known
export const lookupMessage = async (messageId: string) => {
  const path = `/messages/lookup/${encodeURIComponent(messageId)}`;
  return request('GET', path);
};

// Search messages in a conversation
// Supports keyword search, sender filter, and time range filter
export const searchMessages = async (
  conversationId: string,
  params?: {
    q?: string;
    senderId?: string;
    from?: number;
    to?: number;
  },
) => {
  const normalizedConversationId = String(conversationId || '').trim();
  if (!normalizedConversationId) {
    return { data: { items: [], total: 0 }, status: 200 };
  }

  const path = `/messages/${encodeURIComponent(normalizedConversationId)}/search${toQueryString({
    q: params?.q,
    senderId: params?.senderId,
    from: params?.from,
    to: params?.to,
  })}`;
  return request('GET', path);
};

// Upload media file (image, video, audio, document)
// Returns uploaded file info with key, URL, etc.
export const uploadMedia = async (formData: FormData) => {
  return request('POST', '/api/media/upload', formData);
};

// Get pinned messages in a conversation
export const getPinnedMessages = async (
  conversationId: string,
  limit?: number,
) => {
  const normalizedConversationId = String(conversationId || '').trim();
  if (!normalizedConversationId) {
    return { data: { items: [] }, status: 200 };
  }

  const path = `/messages/${encodeURIComponent(normalizedConversationId)}/pins${toQueryString({
    limit: Number(limit || 20),
  })}`;
  return request('GET', path);
};

// Pin a message
export const pinMessage = async (
  conversationId: string,
  createdAt: number,
  messageId: string,
) => {
  const normalizedConversationId = String(conversationId || '').trim();
  if (!normalizedConversationId) {
    throw new Error('Invalid conversation ID');
  }

  const path = `/messages/${encodeURIComponent(normalizedConversationId)}/${createdAt}/${encodeURIComponent(messageId)}/pin`;
  return request('POST', path);
};

// Unpin a message
export const unpinMessage = async (
  conversationId: string,
  createdAt: number,
  messageId: string,
) => {
  const normalizedConversationId = String(conversationId || '').trim();
  if (!normalizedConversationId) {
    throw new Error('Invalid conversation ID');
  }

  const path = `/messages/${encodeURIComponent(normalizedConversationId)}/${createdAt}/${encodeURIComponent(messageId)}/pin`;
  return request('DELETE', path);
};

// Forward a message to one or more conversations
// Uses Backend's /messages/forward endpoint with proper payload structure
export const forwardMessage = async (payload: {
  forward_id: string;
  source_message_id: string;
  targets: Array<{
    message_id: string;
    conversation_id: string;
  }>;
}) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}/messages/forward`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();

  let rawData: any = null;
  try {
    rawData = text ? JSON.parse(text) : null;
  } catch {
    rawData = text || null;
  }

  // Handle specific status codes according to integration guide
  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (response.status === 403) {
    throw new Error('FORBIDDEN');
  }
  if (response.status === 404) {
    throw new Error('SOURCE_NOT_FOUND');
  }
  if (response.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  if (!response.ok) {
    const errorMessage =
      rawData?.message || rawData?.error || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  const data = rawData?.data ?? rawData;
  return { data, status: response.status };
};

export default {
  getMessages,
  getMessageDetails,
  getMessageReactions,
  lookupMessage,
  searchMessages,
  uploadMedia,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
  forwardMessage,
};


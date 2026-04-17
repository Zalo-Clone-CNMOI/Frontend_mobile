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
// Handles GET and POST methods, parses JSON response, throws error on failure
const request = async (
  method: 'GET' | 'POST',
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

// Upload media file (image, video, audio, document)
// Returns uploaded file info with key, URL, etc.
export const uploadMedia = async (formData: FormData) => {
  return request('POST', '/media/upload', formData);
};

export default {
  getMessages,
  getMessageDetails,
  getMessageReactions,
  uploadMedia,
};

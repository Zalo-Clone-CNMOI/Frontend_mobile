import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const request = async (
  method: 'GET',
  path: string,
) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}${path}`, {
    method,
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

  if (data?.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      if (item.attachments && Array.isArray(item.attachments)) {
        const attachment = item.attachments;
      }
    });
  }

  return { data, status: response.status };
};

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

export const getMessageDetails = async (
  conversationId: string,
  createdAt: string | number,
  messageId: string,
) => {
  const path = `/messages/${encodeURIComponent(conversationId)}/${createdAt}/${encodeURIComponent(messageId)}`;
  return request('GET', path);
};

export const getMessageReactions = async (
  messageId: string,
) => {
  const path = `/messages/${encodeURIComponent(messageId)}/reactions`;
  return request('GET', path);
};

export const uploadMedia = async (formData: FormData) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}/media/upload`, {
    method: 'POST',
    body: formData,
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
      rawData?.message || rawData?.error || `Upload failed (${response.status})`;
    throw new Error(errorMessage);
  }

  const data = rawData?.data ?? rawData;
  return { data, status: response.status };
};

export default {
  getMessages,
  getMessageDetails,
  getMessageReactions,
  uploadMedia,
};

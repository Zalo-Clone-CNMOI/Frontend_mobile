import { NETWORK_CONFIG } from '@/src/config/network';
import { apiCallWithRefresh } from '@/src/services/authService';
import type { EntityInfoLang, EntityInfoResponse, EntityType } from './entityInfo.types';

const ENTITY_INFO_URL = NETWORK_CONFIG.API_BASE_URL + '/entity-info';
const MAX_TEXT_LENGTH = 200; // BFF rejects text longer than 200 chars

// BFF wraps payloads as { success, data }; tolerate both wrapped and raw.
function unwrapBffResponse(data: unknown): unknown {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: unknown }).data;
  }
  return data;
}

/**
 * Fetch the LLM info-panel content for a detected entity from the BFF.
 * GET /api/entity-info?text=&type=&lang= — see entity-info.controller.ts.
 */
export async function getEntityInfo(
  text: string,
  type: EntityType,
  lang: EntityInfoLang = 'vi',
): Promise<EntityInfoResponse> {
  const trimmed = (text ?? '').trim().slice(0, MAX_TEXT_LENGTH);
  if (!trimmed) {
    throw new Error('Không có nội dung để tra cứu.');
  }

  const query =
    `text=${encodeURIComponent(trimmed)}` +
    `&type=${encodeURIComponent(type)}` +
    `&lang=${encodeURIComponent(lang)}`;

  const response = await apiCallWithRefresh(`${ENTITY_INFO_URL}?${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const obj = (data ?? {}) as { error?: { message?: string }; message?: string };
    const serverMsg = obj.error?.message || obj.message || '';
    throw new Error(serverMsg || 'Không thể tải thông tin. Vui lòng thử lại.');
  }

  // Boundary cast: the BFF DTO is validated server-side to this exact shape.
  return unwrapBffResponse(data) as EntityInfoResponse;
}

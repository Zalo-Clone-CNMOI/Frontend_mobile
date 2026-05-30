import { NETWORK_CONFIG } from '@/src/config/network';
import { apiCallWithRefresh } from '@/src/services/authService';
import { getConversations } from '@/src/services/conversationsApi';

const AI_API = NETWORK_CONFIG.API_BASE_URL + '/ai-assist';

function unwrapBffResponse(data: any): any {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data;
  }
  return data;
}

export async function getOrCreateZaiConversation(): Promise<string> {
  const response = await apiCallWithRefresh(AI_API + '/conversations/zai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const serverMsg = data?.error?.message || data?.message || '';
    throw new Error(
      serverMsg || 'Không thể tạo hội thoại AI. Vui lòng thử lại sau.',
    );
  }
  let conversationId = data?.data?.conversationId || data?.conversationId;
  if (conversationId) return conversationId;

  // Response 200 nhưng thiếu conversationId (BFF double-wrap chưa deploy).
  // Conversation đã được tạo, tìm từ danh sách conversation.
  const ZAI_BOT_ID = NETWORK_CONFIG.ZAI_BOT_ID;
  const convList = await getConversations({ limit: 50 });
  const body = unwrapBffResponse(convList.data);
  const items = Array.isArray(body) ? body : (body?.items || []);
  console.log('[getOrCreateZaiConversation] conv items count:', items.length);
  const zaiConv = items.find(
    (c: any) => c.type === 'ai_assistant' || c.otherUserId === ZAI_BOT_ID,
  );
  const foundId = zaiConv?.id || zaiConv?.conversationId;
  if (foundId) return foundId;

  console.log('[getOrCreateZaiConversation] raw response:',
    JSON.stringify(data));
  throw new Error('Không thể tạo hội thoại AI: thiếu conversationId');
}

export async function getOrCreateDocumentConversation(documentId: string): Promise<string> {
  const response = await apiCallWithRefresh(AI_API + '/conversations/document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const serverMsg = data?.error?.message || data?.message || '';
    throw new Error(
      serverMsg || 'Không thể tạo hội thoại với tài liệu. Vui lòng thử lại sau.',
    );
  }
  let conversationId = data?.data?.conversationId || data?.conversationId;
  if (conversationId) return conversationId;

  // Fallback: use general Zai conversation
  return getOrCreateZaiConversation();
}

export interface CatchUpResult {
  hadUnread: boolean;
  summary: string;
  messageCount: number;
  truncated: boolean;
  cached: boolean;
  generatedAt: number;
}

export async function catchUp(conversationId: string): Promise<CatchUpResult> {
  if (!conversationId) {
    throw new Error('Không tìm thấy cuộc trò chuyện');
  }
  try {
    const response = await apiCallWithRefresh(
      AI_API + `/conversations/${conversationId}/catch-up`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      // LLM summarisation on a cache miss exceeds the default 15s timeout.
      NETWORK_CONFIG.AI_HTTP_TIMEOUT_MS,
    );
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const serverMsg = data?.error?.message || data?.message || '';
      throw new Error(
        serverMsg || 'Không thể lấy tóm tắt. Vui lòng thử lại sau.',
      );
    }
    const body = unwrapBffResponse(data);
    return {
      hadUnread: body?.hadUnread ?? false,
      summary: body?.summary ?? '',
      messageCount: body?.messageCount ?? 0,
      truncated: body?.truncated ?? false,
      cached: body?.cached ?? false,
      generatedAt: body?.generatedAt ?? Date.now(),
    };
  } catch (error: any) {
    const msg = typeof error?.message === 'string'
      ? error.message
      : 'Không thể kết nối đến máy chủ tóm tắt';
    throw new Error(msg);
  }
}

export async function disbandAiConversation(conversationId: string): Promise<void> {
  const response = await apiCallWithRefresh(
    AI_API + `/conversations/${conversationId}/disband`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) {
    const text = await response.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    const serverMsg = data?.error?.message || data?.message || data?.error || '';
    throw new Error(serverMsg || 'Không thể xoá hội thoại Zai');
  }
}

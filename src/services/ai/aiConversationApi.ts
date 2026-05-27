import { NETWORK_CONFIG } from '@/src/config/network';
import { apiCallWithRefresh } from '@/src/services/authService';

const AI_API = NETWORK_CONFIG.API_BASE_URL + '/ai-assist';

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
    const serverMsg = data?.message || data?.error || '';
    throw new Error(
      serverMsg || 'Không thể tạo hội thoại AI. Vui lòng thử lại sau.',
    );
  }
  const conversationId = data?.data?.conversationId || data?.conversationId;
  if (!conversationId) {
    throw new Error('Không thể tạo hội thoại AI: thiếu conversationId');
  }
  return conversationId;
}
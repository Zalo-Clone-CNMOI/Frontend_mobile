import { getConversationDetail } from './conversationsApi';
import { useConversationDetailStore } from '../store/useConversationDetailStore';
import { NETWORK_CONFIG } from '../config/network';
import type { ConversationV2 } from '../types/chat';

const ZAI_BOT_ID = NETWORK_CONFIG.ZAI_BOT_ID;

/**
 * Resolve callee user IDs for call:start participant_ids.
 * Backend uses this for push + call state; socket fanout uses conv room membership.
 */
export async function resolveCallRecipientIds(
  conversationId: string,
  chat: ConversationV2 | null | undefined,
  currentUserId: string,
): Promise<string[]> {
  const excludeIds = new Set([currentUserId, ZAI_BOT_ID]);

  if (chat?.isGroup) {
    const cachedMembers = useConversationDetailStore.getState().getMembers(conversationId);
    if (cachedMembers.length > 0) {
      return cachedMembers
        .map((m) => m.userId)
        .filter((id) => id && !excludeIds.has(id));
    }

    try {
      await useConversationDetailStore.getState().fetchConversationMembers(conversationId);
      const members = useConversationDetailStore.getState().getMembers(conversationId);
      return members
        .map((m) => m.userId)
        .filter((id) => id && !excludeIds.has(id));
    } catch {
      return [];
    }
  }

  const fromChat =
    (chat as any)?.otherUserId ||
    (chat as any)?.userId ||
    (chat as any)?.peerUserId;

  if (fromChat && !excludeIds.has(fromChat)) {
    return [String(fromChat)];
  }

  try {
    const response = await getConversationDetail(conversationId);
    const data = response?.data?.data || response?.data;
    const members: Array<{ userId?: string; id?: string }> =
      data?.members || data?.participants || [];

    const peer = members
      .map((m) => m.userId || m.id)
      .find((id) => id && !excludeIds.has(id));

    return peer ? [String(peer)] : [];
  } catch {
    return [];
  }
}

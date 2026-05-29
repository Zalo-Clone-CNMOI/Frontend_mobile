import { useAISummaryStore } from '@/src/store/useAISummaryStore';
import { smartReplyService } from '@/src/services/ai/SmartReplyService';

export interface InboundAiTriggerParams {
  conversationId?: string;
  senderId?: string;
  // True when the message was authored by the current user (caller computes
  // this with the same ownership check it uses elsewhere).
  isSelf: boolean;
  currentUserId: string;
}

/**
 * After an inbound (non-self) message is stored, refresh AI features for that
 * conversation: invalidate the now-stale summary and request fresh smart-reply
 * suggestions. Self-authored messages and incomplete payloads are ignored.
 * Failures are swallowed (logged) so this never breaks the message pipeline.
 *
 * This is the single live inbound trigger; ChatMessageHandler.triggerAiAfterMessage
 * is unused (that handler is not registered — see chatService.ts).
 */
export async function triggerInboundAiFeatures(
  params: InboundAiTriggerParams,
): Promise<void> {
  const { conversationId, senderId, isSelf, currentUserId } = params;
  if (!conversationId || !senderId || isSelf) return;
  try {
    useAISummaryStore.getState().invalidate(conversationId);
    await smartReplyService.requestSmartReply({ conversationId, userId: currentUserId });
  } catch (e) {
    console.warn('[inboundAiTrigger] failed to refresh AI features', e);
  }
}

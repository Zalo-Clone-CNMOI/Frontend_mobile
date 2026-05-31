import { catchUp } from './aiConversationApi';
import { useAISummaryStore } from '../../store/useAISummaryStore';

/**
 * Fetch the AI catch-up summary for a conversation and push the result into
 * `useAISummaryStore` so `SummaryModal` can render it. This is the single
 * orchestration shared by the home screen and the chat-options screen.
 *
 * It NEVER navigates and NEVER posts the summary into the Zai conversation.
 * The old behavior routed the summary into the Zai chat as a message, which
 * made Zai re-summarize an already-finished summary (double summarization).
 * Callers own the modal's visibility; this helper only manages store state
 * (loading → summary | error → done).
 *
 * `hadUnread === false` is represented as an empty summary string so the modal
 * can show its "you're all caught up" state without a separate flag.
 *
 * @param conversationId The conversation to summarize.
 */
export async function runCatchUpSummary(conversationId: string): Promise<void> {
  const store = useAISummaryStore.getState();
  store.setError(conversationId, null);
  store.setLoading(conversationId, true);

  try {
    const result = await catchUp(conversationId);
    let summaryText = result.hadUnread ? result.summary || '' : '';
    if (result.truncated && summaryText) {
      summaryText += '\n\n(Lưu ý: Một số tin nhắn cũ đã được lược bớt)';
    }
    store.setSummary(conversationId, summaryText, result.messageCount || 0);
  } catch (error: any) {
    store.setError(
      conversationId,
      String(error?.message || 'Không thể tóm tắt cuộc trò chuyện'),
    );
  } finally {
    store.setLoading(conversationId, false);
  }
}

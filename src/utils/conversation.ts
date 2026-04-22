/**
 * Extract conversation ID from API response
 * Handles various response structures from backend
 */
export const extractConversationId = (response: any): string | null => {
  const conversation = response?.data;
  return (
    conversation?.data?.id ||
    conversation?.data?._id ||
    conversation?.data?.conversationId ||
    conversation?.id ||
    conversation?._id ||
    conversation?.conversationId ||
    null
  );
};

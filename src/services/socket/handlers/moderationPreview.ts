import type { ChatMessage } from "../../../types/chat";

export interface PreviewUpdate {
  content: string;
  type: string;
  timestamp: number;
  senderId?: string;
  senderName?: string;
}

/**
 * Decide how a conversation's list preview should change after `removedId` is
 * removed (e.g. by AI moderation). Pure — takes the conversation's loaded
 * messages and returns the preview to apply, or `null` when nothing should
 * change.
 *
 * Expects the removed message to already be flagged `removed`/`isRevoked` in
 * `messages` (the caller marks it first). Behaviour:
 *  - Removed message not loaded locally → `null` (can't recompute safely; leave
 *    the existing preview alone).
 *  - A newer visible message exists → return it (idempotent: the preview
 *    already shows it when the removed message wasn't the latest).
 *  - The removed message was the only one → `placeholder`, keeping the removed
 *    message's timestamp so the conversation's sort position is unchanged.
 */
export function pickPreviewAfterRemoval(
  messages: ChatMessage[],
  removedId: string,
  placeholder: string,
): PreviewUpdate | null {
  const removed = messages.find(
    (m) => m.id === removedId || m.serverMessageId === removedId,
  );
  if (!removed) return null;

  let lastVisible: ChatMessage | undefined;
  for (const m of messages) {
    if (m.removed || m.isRevoked) continue;
    if (!lastVisible || (m.timestamp ?? 0) > (lastVisible.timestamp ?? 0)) {
      lastVisible = m;
    }
  }

  if (lastVisible) {
    return {
      content: lastVisible.text ?? "",
      type: (lastVisible.type as string) ?? "text",
      timestamp: lastVisible.timestamp ?? removed.timestamp ?? 0,
      senderId: lastVisible.senderId,
      senderName: lastVisible.senderName,
    };
  }

  return {
    content: placeholder,
    type: "text",
    timestamp: removed.timestamp ?? 0,
  };
}

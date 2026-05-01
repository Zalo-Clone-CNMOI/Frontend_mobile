import { BaseHandler } from "./BaseHandler";
import { toLegacyChatMessage, enrichReplyToDetails, updateConversationLastMessage } from "../../chatUtils";

/**
 * ChatSystemHandler - Handles system message events
 *
 * Events:
 * - chat:system-message - System message received
 */

export class ChatSystemHandler extends BaseHandler {
  readonly name = "ChatSystemHandler";
  readonly events = ["chat:system-message"];

  protected createHandler(event: string): (...args: any[]) => void {
    return this.handleSystemMessage.bind(this);
  }

  private async handleSystemMessage(payload: any): Promise<void> {
    this.log("Processing system message", payload);

    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.message_id || payload?.messageId || payload?.id;
    const messageKey = String(messageId || "");

    // Unified deduplication with store check
    if (messageKey) {
      const isDuplicate = await this.checkAndMarkMessage(messageKey, {
        conversationId,
        checkStore: async () => {
          if (!conversationId) return false;
          const { useMessagesStore } = await import("../../../store/useMessagesStore");
          const existingMessages = useMessagesStore.getState().messagesByChatId[conversationId] || [];
          return existingMessages.some(
            (m) => m.id === messageKey || m.serverMessageId === messageKey
          );
        },
      });
      if (isDuplicate) {
        this.log("Message already processed", messageKey);
        return;
      }
    }

    // Convert to UI message format
    const uiMessage = toLegacyChatMessage(payload);
    const enrichedMessage = await enrichReplyToDetails(uiMessage);

    // Add to store
    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    useMessagesStore.getState().addMessage(conversationId, enrichedMessage);

    // Update conversation list
    await updateConversationLastMessage(enrichedMessage, payload);
  }
}

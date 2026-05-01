import { BaseHandler } from "./BaseHandler";
import { enrichReplyToDetails, toLegacyChatMessage } from "../../chatUtils";

/**
 * ChatReactionHandler - Handles chat reaction events
 *
 * Events:
 * - chat:reaction:added - Reaction added to message
 * - chat:reaction:removed - Reaction removed from message
 */

export class ChatReactionHandler extends BaseHandler {
  readonly name = "ChatReactionHandler";
  readonly events = ["chat:reaction:added", "chat:reaction:removed"];

  protected createHandler(event: string): (...args: any[]) => void {
    switch (event) {
      case "chat:reaction:added":
        return this.handleReactionAdded.bind(this);
      case "chat:reaction:removed":
        return this.handleReactionRemoved.bind(this);
      default:
        return () => {};
    }
  }

  private async handleReactionAdded(payload: any): Promise<void> {
    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    const conversationId = payload?.conversation_id;
    const messageId = payload?.message_id;
    const userId = payload?.user_id;
    const reactionType = payload?.reaction_type;

    if (conversationId && messageId && userId && reactionType) {
      useMessagesStore.getState().addReaction(conversationId, messageId, userId, reactionType);
    }
  }

  private async handleReactionRemoved(payload: any): Promise<void> {
    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    const conversationId = payload?.conversation_id;
    const messageId = payload?.message_id;
    const userId = payload?.user_id;

    if (conversationId && messageId && userId) {
      useMessagesStore.getState().removeReaction(conversationId, messageId, userId);
    }
  }
}

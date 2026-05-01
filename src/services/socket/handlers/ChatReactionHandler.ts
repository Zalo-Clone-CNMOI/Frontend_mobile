import { BaseHandler } from "./BaseHandler";
import { getStringField, isChatReactionSocketPayload } from "../payloadGuards";

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

  protected createHandler(event: string): (...args: unknown[]) => void {
    switch (event) {
      case "chat:reaction:added":
        return this.handleReactionAdded.bind(this);
      case "chat:reaction:removed":
        return this.handleReactionRemoved.bind(this);
      default:
        return () => {};
    }
  }

  private async handleReactionAdded(payload: unknown): Promise<void> {
    if (!isChatReactionSocketPayload(payload)) {
      this.error("Invalid reaction add payload", payload);
      return;
    }

    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    const conversationId = getStringField(payload, ['conversation_id']);
    const messageId = getStringField(payload, ['message_id']);
    const userId = getStringField(payload, ['user_id']);
    const reactionType = getStringField(payload, ['reaction_type']);

    if (conversationId && messageId && userId && reactionType) {
      useMessagesStore.getState().addReaction(conversationId, messageId, userId, reactionType);
    }
  }

  private async handleReactionRemoved(payload: unknown): Promise<void> {
    if (!isChatReactionSocketPayload(payload)) {
      this.error("Invalid reaction remove payload", payload);
      return;
    }

    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    const conversationId = getStringField(payload, ['conversation_id']);
    const messageId = getStringField(payload, ['message_id']);
    const userId = getStringField(payload, ['user_id']);

    if (conversationId && messageId && userId) {
      useMessagesStore.getState().removeReaction(conversationId, messageId, userId);
    }
  }
}

import { BaseHandler } from "./BaseHandler";
import * as messagesApi from "../../messagesApi";
import { toLegacyChatMessage, enrichReplyToDetails, updateConversationLastMessage } from "../../chatUtils";

/**
 * ChatMessageHandler - Handles chat:message socket events
 * 
 * Events:
 * - chat:message - New message received
 * - chat:message:updated - Message edited
 * - chat:message:deleted - Message deleted
 */

export class ChatMessageHandler extends BaseHandler {
  readonly name = "ChatMessageHandler";
  readonly events = [
    "chat:message",
    "chat:message:updated",
    "chat:message:deleted",
  ];

  protected createHandler(event: string): (...args: any[]) => void {
    switch (event) {
      case "chat:message":
        return this.handleMessage.bind(this);
      case "chat:message:updated":
        return this.handleMessageUpdated.bind(this);
      case "chat:message:deleted":
        return this.handleMessageDeleted.bind(this);
      default:
        return () => {};
    }
  }

  private async handleMessage(payload: any): Promise<void> {
    this.log("Processing message", payload);
    
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.id || payload?.message_id;
    const createdAt =
      payload?.created_at ?? payload?.createdAt ?? payload?.ts ?? payload?.timestamp;

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

    const hasAttachmentsInPayload =
      Array.isArray(payload?.attachments) && payload.attachments.length > 0;
    const requiresDetails = Boolean(
      conversationId &&
        messageId &&
        createdAt &&
        (hasAttachmentsInPayload || payload?.attachment_key || payload?.fileKey)
    );

    if (!requiresDetails) {
      const uiMessage = toLegacyChatMessage(payload);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      this.log("Adding message to store (no details)", enrichedMessage);
      
      const { useMessagesStore } = await import("../../../store/useMessagesStore");
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      await updateConversationLastMessage(enrichedMessage, payload);
      return;
    }

    try {
      const detailsResp = await messagesApi.getMessageDetails(
        conversationId,
        createdAt,
        messageId
      );
      const fullMessage = detailsResp?.data || payload;
      const uiMessage = toLegacyChatMessage(fullMessage);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      
      this.log("Adding message to store (with details)", enrichedMessage);
      const { useMessagesStore } = await import("../../../store/useMessagesStore");
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      await updateConversationLastMessage(enrichedMessage, payload);
    } catch (e) {
      this.error("Error fetching message details", e);
      const uiMessage = toLegacyChatMessage(payload);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      
      this.log("Adding message to store (fallback)", enrichedMessage);
      const { useMessagesStore } = await import("../../../store/useMessagesStore");
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      await updateConversationLastMessage(enrichedMessage, payload);
    }
  }

  private async handleMessageUpdated(payload: any): Promise<void> {
    const uiMessage = toLegacyChatMessage({
      id: payload?.message_id,
      conversationId: payload?.conversation_id,
      body: payload?.body,
      editedAt: payload?.edited_at,
      senderId: payload?.sender_id,
      createdAt: payload?.created_at,
      timestamp: payload?.timestamp,
    });
    const enrichedMessage = await enrichReplyToDetails(uiMessage);
    
    const { useMessagesStore } = await import("../../../store/useMessagesStore");
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.message_id || payload?.id;
    if (conversationId && messageId) {
      useMessagesStore.getState().updateMessage(conversationId, messageId, enrichedMessage);
    }
  }

  private handleMessageDeleted(payload: any): void {
    const { useMessagesStore } = require("../../../store/useMessagesStore");
    const conversationId = payload?.conversation_id;
    const messageId = payload?.message_id;
    if (conversationId && messageId) {
      useMessagesStore.getState().deleteMessage(conversationId, messageId);
    }
  }
}

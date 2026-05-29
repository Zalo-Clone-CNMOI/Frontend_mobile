import { BaseHandler } from "./BaseHandler";
import { WsEvents } from "../../../realtime/events";
import type { AiSummaryResultPayload } from "../../../realtime/events";
// Static import (leaf store module) so the summary count-mapping is unit-testable.
import { useAISummaryStore } from "../../../store/useAISummaryStore";

/**
 * AIHandler - Handles all AI-related socket events
 *
 * Events:
 * - ai:smart-reply:result - Smart reply suggestions received
 * - ai:summary:result - Summary result received
 * - ai:translate:result - Translation result received
 * - ai:moderation:enforcement - Message removed by moderation
 * - message:entities - Entity detection results
 */

export class AIHandler extends BaseHandler {
  readonly name = "AIHandler";
  readonly events = [
    WsEvents.AiSmartReplyResult,
    WsEvents.AiSummaryResult,
    WsEvents.AiTranslateResult,
    WsEvents.AiModerationEnforcement,
    WsEvents.MessageEntities,
    WsEvents.AiZaiTyping,
    WsEvents.AiStreamChunk,
    WsEvents.AiStreamComplete,
  ];

  protected createHandler(event: string): (...args: any[]) => void {
    switch (event) {
      case WsEvents.AiSmartReplyResult:
        return this.handleSmartReplyResult.bind(this);
      case WsEvents.AiSummaryResult:
        return this.handleSummaryResult.bind(this);
      case WsEvents.AiTranslateResult:
        return this.handleTranslateResult.bind(this);
      case WsEvents.AiModerationEnforcement:
        return this.handleModerationEnforcement.bind(this);
      case WsEvents.MessageEntities:
        return this.handleMessageEntities.bind(this);
      case WsEvents.AiZaiTyping:
        return this.handleZaiTyping.bind(this);
      case WsEvents.AiStreamChunk:
        return this.handleStreamChunk.bind(this);
      case WsEvents.AiStreamComplete:
        return this.handleStreamComplete.bind(this);
      default:
        return () => {};
    }
  }

  private handleSmartReplyResult(payload: any): void {
    const { conversation_id, suggestions } = payload || {};
    if (!conversation_id) return;

    import("../../../store/useAISmartReplyStore").then(({ useAISmartReplyStore }) => {
      useAISmartReplyStore.getState().setSuggestions(conversation_id, suggestions || []);
      useAISmartReplyStore.getState().setLoading(conversation_id, false);
    });
  }

  private handleSummaryResult(payload: AiSummaryResultPayload): void {
    this.log("Summary result:", payload);

    if (!payload?.conversation_id) return;

    // message_range.count is the FE-facing wire field (was mistyped as message_count).
    const messageCount = payload.message_range?.count ?? 0;

    useAISummaryStore.getState().setSummary(payload.conversation_id, payload.summary || "", messageCount);
    useAISummaryStore.getState().setLoading(payload.conversation_id, false);
  }

  private handleTranslateResult(payload: any): void {
    this.log("Translate result:", payload);

    const { message_id, original_body, translated_body, source_language, target_language } = payload || {};
    if (!message_id) return;

    import("../../../store/useAITranslationStore").then(({ useAITranslationStore }) => {
      useAITranslationStore.getState().setTranslation(
        message_id,
        target_language || "vi",
        original_body || "",
        translated_body || original_body || ""
      );
    });
  }

  private handleModerationEnforcement(payload: any): void {
    this.log("Moderation enforcement:", payload);

    const { conversation_id, message_id, removed_message_id, reason, confidence } = payload || {};
    if (!conversation_id || !removed_message_id) return;

    import("../../../store/useMessagesStore").then(({ useMessagesStore }) => {
      useMessagesStore.getState().markMessageRemoved(conversation_id, removed_message_id, reason);
    });

    import("../../../services/toastService").then(({ toast }) => {
      toast.info("Message removed by AI moderation");
    });
  }

  private handleMessageEntities(payload: any): void {
    this.log("Message entities:", payload);

    const { conversation_id, message_id, entities } = payload || {};
    if (!conversation_id || !message_id) return;

    import("../../../store/useEntityDetectionStore").then(({ useEntityDetectionStore }) => {
      useEntityDetectionStore.getState().setEntities(message_id, entities || []);
    });
  }

  private handleZaiTyping(payload: any): void {
    this.log("Zai typing:", payload);

    const { conversation_id, is_typing } = payload || {};
    if (!conversation_id) return;

    import("../../../store/useZaiChatStore").then(({ useZaiChatStore }) => {
      useZaiChatStore.getState().setZaiTyping(conversation_id, Boolean(is_typing));
    });
  }

  private handleStreamChunk(payload: any): void {
    this.log("Stream chunk:", payload);

    const { conversation_id, message_id, chunk } = payload || {};
    if (!conversation_id || !message_id) return;

    import("../../../store/useZaiChatStore").then(({ useZaiChatStore }) => {
      useZaiChatStore.getState().addStreamChunk(conversation_id, message_id, chunk || "");
    });
  }

  private handleStreamComplete(payload: any): void {
    this.log("Stream complete:", payload);

    const { conversation_id, message_id } = payload || {};
    if (!conversation_id || !message_id) return;

    import("../../../store/useZaiChatStore").then(({ useZaiChatStore }) => {
      useZaiChatStore.getState().completeStream(conversation_id, message_id);
    });
  }
}
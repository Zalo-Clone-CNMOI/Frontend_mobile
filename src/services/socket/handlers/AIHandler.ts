import { BaseHandler } from "./BaseHandler";
import { WsEvents } from "../../../realtime/events";

/**
 * AIHandler - Handles all AI-related socket events
 *
 * Events:
 * - ai:smart-reply:result - Smart reply suggestions received
 * - ai:summary:result - Summary result received
 * - ai:translate:result - Translation result received
 * - ai:moderation:enforcement - Message removed by moderation
 * - message:entities - Entity detection results
 * - ai:document:query:result - Document query result
 * - ai:document:processed - Document processing completed
 * - ai:stream:chunk - Streaming response chunk
 * - ai:stream:complete - Streaming completed
 */

export class AIHandler extends BaseHandler {
  readonly name = "AIHandler";
  readonly events = [
    WsEvents.AiSmartReplyResult,
    WsEvents.AiSummaryResult,
    WsEvents.AiTranslateResult,
    WsEvents.AiModerationEnforcement,
    WsEvents.MessageEntities,
    WsEvents.AiDocumentQueryResult,
    WsEvents.AiDocumentProcessed,
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
      case WsEvents.AiDocumentQueryResult:
        return this.handleDocumentQueryResult.bind(this);
      case WsEvents.AiDocumentProcessed:
        return this.handleDocumentProcessed.bind(this);
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

  private handleSummaryResult(payload: any): void {
    this.log("Summary result:", payload);

    const { conversation_id, summary, message_range } = payload || {};
    if (!conversation_id) return;

    const messageCount = message_range?.count || 0;

    import("../../../store/useAISummaryStore").then(({ useAISummaryStore }) => {
      useAISummaryStore.getState().setSummary(conversation_id, summary || "", messageCount);
      useAISummaryStore.getState().setLoading(conversation_id, false);
    });
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

  private handleDocumentQueryResult(payload: any): void {
    this.log("Document query result:", payload);

    const { document_id, query, answer, sources } = payload || {};
    if (!document_id) return;

    const mappedSources = (sources || []).map((s: any) => ({
      text: s.content_preview || s.text || "",
      similarity: s.similarity_score ?? s.similarity ?? 0,
    }));

    import("../../../store/useAIDocumentStore").then(({ useAIDocumentStore }) => {
      useAIDocumentStore.getState().setQueryResult(document_id, query, {
        answer: answer || "",
        sources: mappedSources,
      });
    });
  }

  private handleDocumentProcessed(payload: any): void {
    this.log("Document processed:", payload);

    const { document_id, file_name, status, error_message, chunks_count } = payload || {};
    if (!document_id) return;

    import("../../../store/useAIDocumentStore").then(({ useAIDocumentStore }) => {
      if (status === "completed") {
        useAIDocumentStore.getState().updateDocumentStatus(document_id, "completed");
      } else {
        useAIDocumentStore.getState().updateDocumentStatus(document_id, "failed", error_message);
      }
    });
  }

  private handleStreamChunk(payload: any): void {
    const { conversation_id, content, is_final } = payload || {};

    import("../../../store/useAIDocumentStore").then(({ useAIDocumentStore }) => {
      useAIDocumentStore.getState().appendStreamChunk(conversation_id, content);

      if (is_final) {
        useAIDocumentStore.getState().setStreamComplete(conversation_id);
      }
    });
  }

  private handleStreamComplete(payload: any): void {
    this.log("Stream complete:", payload);

    const { conversation_id, total_chunks } = payload || {};
    if (!conversation_id) return;

    import("../../../store/useAIDocumentStore").then(({ useAIDocumentStore }) => {
      useAIDocumentStore.getState().setStreamComplete(conversation_id);
    });
  }
}
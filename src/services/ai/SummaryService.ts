import { getSocket } from "../socket";
import { WsEvents } from "../../realtime/events";
import { useAISummaryStore } from "../../store/useAISummaryStore";
import { ensureFreshSocketAuth } from "./utils";

export interface SummaryRequest {
  conversation_id: string;
  message_count?: number;
}

export interface SummaryOptions {
  conversationId: string;
  messageCount?: number;
}

export class SummaryService {
  async requestSummary(options: SummaryOptions): Promise<void> {
    const { conversationId, messageCount = 200 } = options;
    if (!conversationId) {
      console.warn("[SummaryService] Missing conversationId");
      return;
    }

    const loadingTimeout = setTimeout(() => {
      useAISummaryStore.getState().setLoading(conversationId, false);
    }, 20000);

    const authOk = await ensureFreshSocketAuth();
    if (!authOk) {
      console.warn("[SummaryService] Cannot authenticate socket");
      clearTimeout(loadingTimeout);
      useAISummaryStore.getState().setLoading(conversationId, false);
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.warn("[SummaryService] Socket not available or not connected");
      clearTimeout(loadingTimeout);
      useAISummaryStore.getState().setLoading(conversationId, false);
      return;
    }

    useAISummaryStore.getState().setLoading(conversationId, true);
    useAISummaryStore.getState().setError(conversationId, null);

    const payload: SummaryRequest = {
      conversation_id: conversationId,
      message_count: messageCount,
    };

    console.log("[SummaryService] Requesting summary:", payload);

    socket.emit(
      WsEvents.AiSummaryRequest,
      payload,
      (ack: any) => {
        clearTimeout(loadingTimeout);
        if (ack?.error) {
          console.error("[SummaryService] Error:", ack.error);
          useAISummaryStore.getState().setError(conversationId, ack.error);
          useAISummaryStore.getState().setLoading(conversationId, false);
        }
      }
    );
  }

  invalidateSummary(conversationId: string): void {
    useAISummaryStore.getState().invalidate(conversationId);
  }

  getSummary(conversationId: string) {
    return useAISummaryStore.getState().getSummary(conversationId);
  }

  isLoading(conversationId: string): boolean {
    return useAISummaryStore.getState().isLoading(conversationId);
  }
}

export const summaryService = new SummaryService();
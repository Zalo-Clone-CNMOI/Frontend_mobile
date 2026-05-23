import { getSocket } from "../socket";
import { WsEvents } from "../../realtime/events";
import { useAISmartReplyStore } from "../../store/useAISmartReplyStore";
import { useMessagesStore } from "../../store/useMessagesStore";
import { ensureFreshSocketAuth } from "./utils";

export interface SmartReplyRequest {
  conversation_id: string;
  last_message_id: string;
  last_message_body: string;
}

export interface SmartReplyOptions {
  conversationId: string;
  userId: string;
  messageCount?: number;
}

export class SmartReplyService {
  async requestSmartReply(options: SmartReplyOptions): Promise<void> {
    const { conversationId, userId, messageCount = 10 } = options;
    const loadingTimeout = setTimeout(() => {
      useAISmartReplyStore.getState().setLoading(conversationId, false);
    }, 20000);

    const authOk = await ensureFreshSocketAuth();
    if (!authOk) {
      console.warn("[SmartReplyService] Cannot authenticate socket");
      clearTimeout(loadingTimeout);
      useAISmartReplyStore.getState().setLoading(conversationId, false);
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.warn("[SmartReplyService] Socket not available or not connected");
      clearTimeout(loadingTimeout);
      useAISmartReplyStore.getState().setLoading(conversationId, false);
      return;
    }

    useAISmartReplyStore.getState().setLoading(conversationId, true);
    useAISmartReplyStore.getState().setError(conversationId, null);

    const messages = useMessagesStore.getState().getMessagesByChatId(conversationId);
    const recentMessages = messages.slice(-messageCount);

    const validMessages = recentMessages.filter((m) => !m.deletedFor && !m.isRevoked);
    const lastMsg = validMessages[validMessages.length - 1];
    const lastMessageId = lastMsg?.serverMessageId || lastMsg?.id || "";
    const lastMessageBody = lastMsg?.text || lastMsg?.content || "";

    const payload: SmartReplyRequest = {
      conversation_id: conversationId,
      last_message_id: lastMessageId,
      last_message_body: lastMessageBody,
    };

    console.log("[SmartReplyService] Requesting smart reply:", payload);

    socket.emit(
      WsEvents.AiSmartReplyRequest,
      payload,
      (ack: any) => {
        clearTimeout(loadingTimeout);
        if (ack?.error) {
          console.error("[SmartReplyService] Error:", ack.error);
          useAISmartReplyStore.getState().setError(conversationId, ack.error);
          useAISmartReplyStore.getState().setLoading(conversationId, false);
        }
      }
    );
  }

  clearSuggestions(conversationId: string): void {
    useAISmartReplyStore.getState().clearSuggestions(conversationId);
  }

  getSuggestions(conversationId: string): string[] {
    return useAISmartReplyStore.getState().getSuggestions(conversationId);
  }

  isLoading(conversationId: string): boolean {
    return useAISmartReplyStore.getState().isLoading(conversationId);
  }
}

export const smartReplyService = new SmartReplyService();
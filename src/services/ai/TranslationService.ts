import { getSocket } from "../socket";
import { WsEvents } from "../../realtime/events";
import { useAITranslationStore } from "../../store/useAITranslationStore";
import { ensureFreshSocketAuth } from "./utils";

export interface TranslateRequest {
  message_id: string;
  conversation_id: string;
  body: string;
  target_language: string;
}

export interface TranslateOptions {
  conversationId: string;
  userId: string;
  messageId: string;
  body: string;
  targetLanguage?: string;
}

// ai-core emits nothing on engine failure (see ai.consumer.ts), so a missing
// result would otherwise hang the spinner forever. This timeout converts that
// silent failure into a user-visible, retryable error.
const TRANSLATION_TIMEOUT_MS = 20000;

const CONNECT_ERROR = 'Không thể kết nối để dịch. Vui lòng thử lại.';
const TIMEOUT_ERROR = 'Dịch quá thời gian chờ. Vui lòng thử lại.';
const GENERIC_ERROR = 'Dịch thất bại. Vui lòng thử lại.';

export class TranslationService {
  async requestTranslation(options: TranslateOptions): Promise<boolean> {
    const {
      conversationId,
      messageId,
      body,
      targetLanguage = 'vi',
    } = options;

    const store = useAITranslationStore.getState();
    store.setLoading(messageId, targetLanguage, true);
    store.setError(messageId, targetLanguage, null);

    // Safety net for the silent-failure case (no result ever arrives). Guarded so
    // a result that arrived first (which clears loading) makes this a no-op.
    const loadingTimeout = setTimeout(() => {
      const s = useAITranslationStore.getState();
      if (!s.isLoading(messageId, targetLanguage)) return;
      s.setLoading(messageId, targetLanguage, false);
      s.setError(messageId, targetLanguage, TIMEOUT_ERROR);
    }, TRANSLATION_TIMEOUT_MS);

    const authOk = await ensureFreshSocketAuth();
    if (!authOk) {
      console.warn("[TranslationService] Cannot authenticate socket");
      clearTimeout(loadingTimeout);
      const s = useAITranslationStore.getState();
      s.setLoading(messageId, targetLanguage, false);
      s.setError(messageId, targetLanguage, CONNECT_ERROR);
      return false;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.warn("[TranslationService] Socket not available or not connected");
      clearTimeout(loadingTimeout);
      const s = useAITranslationStore.getState();
      s.setLoading(messageId, targetLanguage, false);
      s.setError(messageId, targetLanguage, CONNECT_ERROR);
      return false;
    }

    const payload: TranslateRequest = {
      message_id: messageId,
      conversation_id: conversationId,
      body,
      target_language: targetLanguage,
    };

    console.log("[TranslationService] Requesting translation:", payload);

    socket.emit(
      WsEvents.AiTranslateRequest,
      payload,
      (ack: any) => {
        if (ack?.error) {
          clearTimeout(loadingTimeout);
          console.error("[TranslationService] Error:", ack.error);
          const s = useAITranslationStore.getState();
          s.setError(
            messageId,
            targetLanguage,
            typeof ack.error === "string" ? ack.error : GENERIC_ERROR
          );
          s.setLoading(messageId, targetLanguage, false);
        }
      }
    );

    return true;
  }

  getCachedTranslation(messageId: string, targetLang: string): { original: string; translated: string } | null {
    return useAITranslationStore.getState().getTranslation(messageId, targetLang);
  }

  hasTranslation(messageId: string, targetLang: string = 'vi'): boolean {
    return this.getCachedTranslation(messageId, targetLang) !== null;
  }
}

export const translationService = new TranslationService();
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

export class TranslationService {
  async requestTranslation(options: TranslateOptions): Promise<boolean> {
    const {
      conversationId,
      userId,
      messageId,
      body,
      targetLanguage = 'vi',
    } = options;

    const authOk = await ensureFreshSocketAuth();
    if (!authOk) {
      console.warn("[TranslationService] Cannot authenticate socket");
      return false;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.warn("[TranslationService] Socket not available or not connected");
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
          console.error("[TranslationService] Error:", ack.error);
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
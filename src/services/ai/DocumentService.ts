import * as DocumentPicker from 'expo-document-picker';
import { getSocket } from "../socket";
import { WsEvents } from "../../realtime/events";
import { getCurrentUser } from "../authService";
import { uploadMedia } from "../mediaService";
import { useAIDocumentStore, DocumentMeta } from "../../store/useAIDocumentStore";
import { ensureFreshSocketAuth } from "./utils";

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/json',
  'text/markdown',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadDocumentOptions {
  onProgress?: (progress: number) => void;
  conversationId?: string;
}

interface PickedFile {
  name: string;
  uri: string;
  type: string;
  size: number;
}

export class DocumentService {
  async pickDocument(): Promise<{ name: string; uri: string; type: string; size: number } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      return {
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      };
    } catch (error) {
      console.error("[DocumentService] Pick failed:", error);
      return null;
    }
  }

  async uploadDocument(options?: UploadDocumentOptions): Promise<string | null>;
  async uploadDocument(file: PickedFile, options?: UploadDocumentOptions): Promise<string | null>;
  async uploadDocument(fileOrOptions?: PickedFile | UploadDocumentOptions, maybeOptions?: UploadDocumentOptions): Promise<string | null> {
    let file: PickedFile | null = null;
    let opts: UploadDocumentOptions = {};

    if (fileOrOptions && typeof fileOrOptions === 'object' && 'uri' in fileOrOptions) {
      file = fileOrOptions as PickedFile;
      opts = maybeOptions ?? {};
    } else {
      file = await this.pickDocument();
      opts = (fileOrOptions as UploadDocumentOptions) ?? {};
    }

    if (!file) return null;

    if (file.size > MAX_FILE_SIZE) {
      console.warn(`[DocumentService] File too large: ${file.size} bytes (max ${MAX_FILE_SIZE})`);
      return null;
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      console.error("[DocumentService] User not authenticated");
      return null;
    }

    const documentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

    this.createDocumentMetadata(documentId, file.name, file.size, file.type);
    useAIDocumentStore.getState().updateDocumentStatus(documentId, 'uploading');

    try {
      const result = await uploadMedia(
        {
          uri: file.uri,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        },
        user.id,
      );

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(WsEvents.AiDocumentUpload, {
          document_id: documentId,
          conversation_id: opts.conversationId || '',
          file_name: file.name,
          file_key: result.key,
          content_type: file.type,
          file_size: file.size,
          user_id: user.id,
          uploaded_at: Date.now(),
        });
      }

      useAIDocumentStore.getState().updateDocumentStatus(documentId, 'processing');

      return documentId;
    } catch (error) {
      console.error("[DocumentService] Upload failed:", error);
      useAIDocumentStore.getState().updateDocumentStatus(
        documentId,
        'failed',
        error instanceof Error ? error.message : 'Upload failed'
      );
      return null;
    }
  }

  createDocumentMetadata(
    documentId: string,
    fileName: string,
    fileSize: number,
    contentType: string
  ): DocumentMeta {
    const docMeta: DocumentMeta = {
      document_id: documentId,
      file_name: fileName,
      file_size: fileSize,
      content_type: contentType,
      status: 'uploading',
      uploaded_at: Date.now(),
    };

    useAIDocumentStore.getState().addDocument(docMeta);
    return docMeta;
  }

  updateDocumentToProcessing(documentId: string): void {
    useAIDocumentStore.getState().updateDocumentStatus(documentId, 'processing');
  }

  async queryDocument(documentId: string, query: string, conversationId?: string): Promise<void> {
    const authOk = await ensureFreshSocketAuth();
    if (!authOk) {
      console.warn("[DocumentService] Cannot authenticate socket");
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.warn("[DocumentService] Socket not available or not connected");
      return;
    }

    useAIDocumentStore.getState().setQueryResult(documentId, query, {
      answer: '',
      sources: [],
    });

    socket.emit(
      WsEvents.AiDocumentQueryRequest,
      {
        document_id: documentId,
        conversation_id: conversationId || '',
        query,
        top_k: 3,
      },
      (ack: any) => {
        if (ack?.error) {
          console.error("[DocumentService] Query error:", ack.error);
        }
      }
    );
  }

  getDocument(documentId: string) {
    return useAIDocumentStore.getState().getDocument(documentId);
  }

  getQueryResult(documentId: string) {
    return useAIDocumentStore.getState().getQueryResult(documentId);
  }

  removeDocument(documentId: string) {
    useAIDocumentStore.getState().removeDocument(documentId);
  }

  getStreamChunk(conversationId: string) {
    return useAIDocumentStore.getState().getStreamChunk(conversationId);
  }
}

export const documentService = new DocumentService();
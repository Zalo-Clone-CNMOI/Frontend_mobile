import { create } from 'zustand';

export interface DocumentMeta {
  document_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  chunks_count?: number;
  uploaded_at: number;
}

export interface DocumentSource {
  text: string;
  similarity: number;
  chunk_index?: number;
  page_number?: number;
}

export interface QueryResult {
  query: string;
  answer: string;
  sources: DocumentSource[];
  timestamp: number;
}

interface AIDocumentState {
  documents: Map<string, DocumentMeta>;
  queryResults: Map<string, QueryResult>;
  streamingChunks: Map<string, string>;

  addDocument(doc: DocumentMeta): void;
  updateDocumentStatus(docId: string, status: DocumentMeta['status'], errorMessage?: string): void;
  removeDocument(docId: string): void;
  getDocument(docId: string): DocumentMeta | undefined;

  setQueryResult(docId: string, query: string, result: Omit<QueryResult, 'query' | 'timestamp'>): void;
  getQueryResult(docId: string): QueryResult | undefined;
  clearQueryResults(docId: string): void;

  appendStreamChunk(conversationId: string, chunk: string): void;
  setStreamComplete(conversationId: string): void;
  getStreamChunk(conversationId: string): string;
  clearStreamChunk(conversationId: string): void;
}

export const useAIDocumentStore = create<AIDocumentState>((set, get) => ({
  documents: new Map(),
  queryResults: new Map(),
  streamingChunks: new Map(),

  addDocument: (doc) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(doc.document_id, doc);
      return { documents: newDocs };
    });
  },

  updateDocumentStatus: (docId, status, errorMessage) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      const existing = newDocs.get(docId);
      if (existing) {
        newDocs.set(docId, {
          ...existing,
          status,
          error_message: errorMessage,
        });
      }
      return { documents: newDocs };
    });
  },

  removeDocument: (docId) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.delete(docId);
      const newResults = new Map(state.queryResults);
      newResults.delete(docId);
      return { documents: newDocs, queryResults: newResults };
    });
  },

  getDocument: (docId) => {
    return get().documents.get(docId);
  },

  setQueryResult: (docId, query, result) => {
    set((state) => {
      const newResults = new Map(state.queryResults);
      newResults.set(docId, {
        query,
        answer: result.answer,
        sources: result.sources,
        timestamp: Date.now(),
      });
      return { queryResults: newResults };
    });
  },

  getQueryResult: (docId) => {
    return get().queryResults.get(docId);
  },

  clearQueryResults: (docId) => {
    set((state) => {
      const newResults = new Map(state.queryResults);
      newResults.delete(docId);
      return { queryResults: newResults };
    });
  },

  appendStreamChunk: (conversationId, chunk) => {
    set((state) => {
      const newChunks = new Map(state.streamingChunks);
      const existing = newChunks.get(conversationId) || '';
      newChunks.set(conversationId, existing + chunk);
      return { streamingChunks: newChunks };
    });
  },

  setStreamComplete: (conversationId) => {
    set((state) => {
      const newChunks = new Map(state.streamingChunks);
      newChunks.delete(conversationId);
      return { streamingChunks: newChunks };
    });
  },

  getStreamChunk: (conversationId) => {
    return get().streamingChunks.get(conversationId) || '';
  },

  clearStreamChunk: (conversationId) => {
    set((state) => {
      const newChunks = new Map(state.streamingChunks);
      newChunks.delete(conversationId);
      return { streamingChunks: newChunks };
    });
  },
}));
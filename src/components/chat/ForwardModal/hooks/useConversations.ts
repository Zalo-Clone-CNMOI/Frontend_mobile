import { useState, useCallback } from 'react';
import { fetchConversations } from '@/src/services/chatService';

interface Conversation {
  conversationId: string;
  name?: string;
  avatar?: string | null;
  isGroup?: boolean;
  lastMessage?: {
    type?: string;
    content?: string;
    senderName?: string;
    fromMe?: boolean;
    attachments?: Array<{
      type?: string;
      content_type?: string;
    }>;
  };
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  loadConversations: () => Promise<void>;
  filteredConversations: (query: string) => Conversation[];
}

export const useConversations = (): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredConversations = useCallback(
    (query: string): Conversation[] => {
      if (!query.trim()) return conversations;
      const lowerQuery = query.toLowerCase();
      return conversations.filter((chat) =>
        chat.name?.toLowerCase().includes(lowerQuery)
      );
    },
    [conversations]
  );

  return {
    conversations,
    loading,
    error,
    loadConversations,
    filteredConversations,
  };
};

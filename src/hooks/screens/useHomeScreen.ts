import { useChatsStore } from '@/src/store/useChatsStore';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useHomeScreenLogic() {
  const router = useRouter();
  const { user } = useAuth();
  const chats = useChatsStore((state) => state.chats);
  const [refreshing, setRefreshing] = useState(false);
  const lastLoadedUserKeyRef = useRef<string>('');

  useEffect(() => {
    const userKey = `${user?.id || ''}:${user?.phone || ''}`;
    if (userKey === lastLoadedUserKeyRef.current) return;
    lastLoadedUserKeyRef.current = userKey;
    useChatsStore.getState().initializeChats();
  }, [user?.id, user?.phone]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useChatsStore.getState().initializeChats();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openChat = useCallback(
    (item: any) => {
      const conversationId = item?.conversationId || item?.id || item?._id;
      if (!conversationId) return;

      const chatName = item?.name || 'Chat';
      try {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: conversationId,
            name: chatName,
          },
        });
      } catch {
        router.push(`/chat/${conversationId}?name=${encodeURIComponent(chatName)}`);
      }
    },
    [router],
  );

  const listData = useMemo(() => chats || [], [chats]);

  return {
    listData,
    onRefresh,
    openChat,
    refreshing,
  };
}

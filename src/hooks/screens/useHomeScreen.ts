import { useChatsStore } from '@/src/store/useChatsStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useChatStore } from '@/src/store/chatStore';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useHomeScreenLogic() {
  const router = useRouter();
  const { user } = useAuth();
  const chats = useChatsStore((state) => state.chats);
  const [refreshing, setRefreshing] = useState(false);
  const lastLoadedUserKeyRef = useRef<string>('');

  // ✅ FIX 4: Cleanup stores khi user thay đổi để tránh stale data
  useEffect(() => {
    const userKey = `${user?.id || ''}:${user?.phone || ''}`;
    
    // Nếu userKey thay đổi (logout/login), reset stores
    if (lastLoadedUserKeyRef.current && lastLoadedUserKeyRef.current !== userKey) {
      console.log('[HomeScreen] User changed, resetting stores');
      useChatsStore.getState().reset();
      useMessagesStore.getState().reset();
      useChatStore.getState().reset();
    }
    
    if (userKey === lastLoadedUserKeyRef.current) return;
    lastLoadedUserKeyRef.current = userKey;
    
    if (user?.id) {
      useChatsStore.getState().initializeChats();
    }
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

  // ✅ FIX 5: Auto-refresh khi screen được focus
  useFocusEffect(
    useCallback(() => {
      console.log('[HomeScreen] Focused, refreshing chats');
      useChatsStore.getState().initializeChats();
    }, [])
  );

  const listData = useMemo(() => chats || [], [chats]);

  return {
    listData,
    onRefresh,
    openChat,
    refreshing,
  };
}

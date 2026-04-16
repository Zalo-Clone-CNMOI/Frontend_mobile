import { useAuth } from '@/src/contexts/AuthContext';
import { createDirect } from '@/src/services/conversationsApi';
import { fetchRuntimeFriendSnapshot } from '@/src/services/realtime/runtimeFriendService';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

export type ContactListItem = {
  id: string;
  fullName: string;
  avatar: string | null;
  status: string;
  phone: string;
  email: string;
  bio: string;
  isOnline: boolean;
  lastSeenAt?: string;
  friendsSince?: string;
  mutualFriends?: number;
  friendType?: string;
  friendStatus?: string;
  friendCategory?: string;
  friendRequestStatus?: string;
  friendRequestSent?: boolean;
  friendRequestReceived?: boolean;
  friendRequestMessage?: string;
};

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/' + avatar.replace(/^\//, '');
};

const mapFriend = (friend: any): ContactListItem => ({
  id: friend.id || friend._id,
  fullName: friend.fullName || friend.name || '',
  avatar: normalizeAvatarUrl(friend.avatarUrl || friend.avatar),
  status: friend.status || 'offline',
  phone: friend.phone || '',
  email: friend.email || '',
  bio: friend.bio || '',
  isOnline: friend.status === 'online',
  lastSeenAt: friend.lastSeenAt || undefined,
  friendsSince: friend.friendsSince || undefined,
  mutualFriends: friend.mutualFriends || 0,
  friendType: friend.friendType || 'normal',
  friendStatus: friend.friendStatus || 'accepted',
  friendCategory: friend.friendCategory || 'personal',
  friendRequestStatus: friend.friendRequestStatus || 'none',
  friendRequestSent: friend.friendRequestSent || false,
  friendRequestReceived: friend.friendRequestReceived || false,
  friendRequestMessage: friend.friendRequestMessage || '',
});

export function useContactsScreenLogic() {
  const router = useRouter();
  const { user } = useAuth();
  const realtimeFriends = useRealtimeStore((state) => state.friends);
  const receivedRequests = useRealtimeStore((state) => state.receivedRequests);
  const isHydrating = useRealtimeStore((state) => state.isHydrating);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [usersFilterType, setUsersFilterType] = useState<'all' | 'recent'>('all');
  const [creatingConversation, setCreatingConversation] = useState(false);

  const friends = useMemo(() => realtimeFriends.map(mapFriend), [realtimeFriends]);

  const navigateToChat = useCallback(
    (conversationId: string, friendName: string) => {
      try {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: conversationId,
            name: friendName,
          },
        });
      } catch {
        router.push(`/chat/${conversationId}?name=${encodeURIComponent(friendName)}`);
      }
    },
    [router],
  );

  const handleStartConversation = useCallback(
    async (friendId: string, friendName: string) => {
      if (creatingConversation) return;

      setCreatingConversation(true);
      try {
        const response = await createDirect(friendId);
        const conversation = response?.data;
        const conversationId =
          conversation?.data?.id ||
          conversation?.data?._id ||
          conversation?.data?.conversationId ||
          conversation?.id ||
          conversation?._id ||
          conversation?.conversationId;

        if (conversationId) {
          navigateToChat(String(conversationId), friendName);
        }
      } catch (startErr) {
      } finally {
        setCreatingConversation(false);
      }
    },
    [creatingConversation, navigateToChat],
  );

  const refreshFriends = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const snapshot = await fetchRuntimeFriendSnapshot();
      useRealtimeStore.getState().setFriendSnapshot(snapshot);
    } catch (fetchErr) {
      setError('Network connection failed. Please check your internet connection.');
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFriends();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFriends]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    refreshFriends().finally(() => setLoading(false));
  }, [refreshFriends]);

  const filteredFriends = useMemo(() => {
    if (usersFilterType === 'recent') {
      return friends.filter((friend) => friend.isOnline || friend.status === 'online');
    }
    return friends;
  }, [friends, usersFilterType]);

  return {
    activeTab,
    creatingConversation,
    error,
    filteredFriends,
    friends,
    handleRetry,
    handleStartConversation,
    hasNext: false,
    loading: loading || isHydrating,
    loadMore: () => undefined,
    onRefresh,
    receivedRequests,
    refreshing,
    setActiveTab,
    setUsersFilterType,
    usersFilterType,
  };
}

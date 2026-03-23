import { useAuth } from '@/src/contexts/AuthContext';
import { createDirect } from '@/src/services/conversationsApi';
import * as friendsApi from '@/src/services/friendsApi';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type ContactListItem = {
  id: string;
  fullName: string;
  avatar: string;
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

const mapFriend = (friend: any): ContactListItem => ({
  id: friend.id || friend._id,
  fullName:
    friend.fullName ||
    friend.name ||
    `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
  avatar:
    friend.avatarUrl ||
    friend.avatar ||
    `https://i.pravatar.cc/200?u=${friend.id || Math.random()}`,
  status: friend.status || 'offline',
  phone: friend.phone || '',
  email: friend.email || '',
  bio: friend.bio || '',
  isOnline: friend.isOnline || friend.status === 'online',
  lastSeenAt: friend.lastSeenAt,
  friendsSince: friend.friendsSince,
  mutualFriends: friend.mutualFriends || 0,
  friendType: friend.friendType || 'normal',
  friendStatus: friend.friendStatus || 'pending',
  friendCategory: friend.friendCategory || 'personal',
  friendRequestStatus: friend.friendRequestStatus || 'none',
  friendRequestSent: friend.friendRequestSent || false,
  friendRequestReceived: friend.friendRequestReceived || false,
  friendRequestMessage: friend.friendRequestMessage || '',
});

export function useContactsScreenLogic() {
  const router = useRouter();
  const { user } = useAuth();

  const [friends, setFriends] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [usersFilterType, setUsersFilterType] = useState<'all' | 'recent'>('all');
  const [creatingConversation, setCreatingConversation] = useState(false);

  const LIMIT = 50;

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
        console.error('Failed to create conversation:', startErr);
      } finally {
        setCreatingConversation(false);
      }
    },
    [creatingConversation, navigateToChat],
  );

  const fetchFriends = useCallback(
    async (opts: { page?: number; replace?: boolean } = {}) => {
      const p = opts.page || 1;
      if (!user?.tokens?.accessToken) return;

      if (opts.replace) setRefreshing(true);
      else setLoading(true);

      try {
        const resp = await friendsApi.getFriends({ page: p, limit: LIMIT });
        const data = resp?.data || {};

        if (resp.status >= 200 && resp.status < 300) {
          setError(null);

          const friendsArray = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.friends)
                ? data.friends
                : [];

          const mappedFriends = Array.isArray(friendsArray)
            ? friendsArray.map(mapFriend)
            : [];

          if (opts.replace || p === 1) {
            setFriends(mappedFriends);
          } else {
            setFriends((prev) => [...prev, ...mappedFriends]);
          }

          const meta = data.meta || data.pagination || {};
          setHasNext(
            !!meta.hasNext ||
              !!meta.has_next ||
              (meta.page && meta.totalPages ? meta.page < meta.totalPages : false),
          );
          setPage(p);
        }
      } catch (fetchErr) {
        console.error('Error fetching friends:', fetchErr);
        setFriends([]);
        setHasNext(false);
        setError('Network connection failed. Please check your internet connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.tokens?.accessToken],
  );

  useEffect(() => {
    fetchFriends({ page: 1, replace: true });
  }, [fetchFriends]);

  const onRefresh = useCallback(
    () => fetchFriends({ page: 1, replace: true }),
    [fetchFriends],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    fetchFriends({ page: 1, replace: true });
  }, [fetchFriends]);

  const loadMore = useCallback(() => {
    if (!hasNext || loading) return;
    fetchFriends({ page: page + 1 });
  }, [fetchFriends, hasNext, loading, page]);

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
    hasNext,
    loading,
    loadMore,
    onRefresh,
    refreshing,
    setActiveTab,
    setUsersFilterType,
    usersFilterType,
  };
}

import { useAuth } from '@/src/contexts/AuthContext';
import { createDirect } from '@/src/services/conversationsApi';
import { NETWORK_CONFIG } from '@/src/config/network';
import { fetchRuntimeFriendSnapshot } from '@/src/services/realtime/runtimeFriendService';
import { usePresenceStore } from '@/src/store/usePresenceStore';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import type { ContactListItem } from '@/src/types/contacts';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

const normalizeAvatar = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    // Replace bucket name if URL from backend uses wrong bucket
    return avatar.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
  }
  return NETWORK_CONFIG.S3_BASE_URL + '/' + avatar.replace(/^\//, '');
};

const mapFriend = (friend: any): ContactListItem => ({
  id: friend.id || friend._id,
  fullName: friend.fullName || friend.name || '',
  avatar: normalizeAvatar(friend.avatarUrl || friend.avatar),
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
  const presenceMap = usePresenceStore((state) => state.presenceMap);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [usersFilterType, setUsersFilterType] = useState<'all' | 'recent'>('all');

  const friends = useMemo(() => {
    return realtimeFriends.map((friend) => {
      const mappedFriend = mapFriend(friend);
      // Merge real-time presence data
      const presence = presenceMap[friend.id];
      if (presence) {
        mappedFriend.status = presence.status;
        mappedFriend.isOnline = presence.status === 'online';
        mappedFriend.lastSeenAt = presence.last_seen_at ? new Date(presence.last_seen_at).toISOString() : mappedFriend.lastSeenAt;
      }
      return mappedFriend;
    });
  }, [realtimeFriends, presenceMap]);

  const handleViewProfile = useCallback(
    (friendId: string) => {
      try {
        router.push({
          pathname: '/profile/[userId]',
          params: {
            userId: friendId,
          },
        });
      } catch {
        router.push(`/profile/${friendId}`);
      }
    },
    [router],
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

  // ✅ FIX 1: Auto-refresh khi screen được focus
  useFocusEffect(
    useCallback(() => {
      console.log('[ContactsScreen] Focused, refreshing friends');
      refreshFriends();
    }, [refreshFriends])
  );

  const filteredFriends = useMemo(() => {
    if (usersFilterType === 'recent') {
      return friends.filter((friend) => friend.isOnline || friend.status === 'online');
    }
    return friends;
  }, [friends, usersFilterType]);

  return {
    activeTab,
    error,
    filteredFriends,
    friends,
    handleRetry,
    handleViewProfile,
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

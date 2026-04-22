import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getRealtimeSocket } from "../../services/realtime/defaultRealtimeClients";
import {
  fetchRuntimeFriendSnapshot,
  getRuntimeFriendService,
  resetRuntimeFriendService,
} from "../../services/realtime/runtimeFriendService";
import { useRealtimeStore } from "../../store/useRealtimeStore";
import { subscribeToGroupInviteEvents, unsubscribeFromGroupInviteEvents } from "../../services/groupInviteSocketHandler";
import { subscribeToGroupEvents, unsubscribeFromGroupEvents } from "../../services/groupEventsHandler";

const buildEventId = (prefix: string, suffix?: string | number) =>
  `${prefix}:${String(suffix || Date.now())}`;

export function AppRealtimeBridge() {
  const { isAuthenticated, user } = useAuth();
  const setHydrating = useRealtimeStore((state) => state.setHydrating);
  const setFriendSnapshot = useRealtimeStore((state) => state.setFriendSnapshot);
  const upsertFriend = useRealtimeStore((state) => state.upsertFriend);
  const removeFriend = useRealtimeStore((state) => state.removeFriend);
  const upsertReceivedRequest = useRealtimeStore((state) => state.upsertReceivedRequest);
  const upsertSentRequest = useRealtimeStore((state) => state.upsertSentRequest);
  const removeRequest = useRealtimeStore((state) => state.removeRequest);
    const resetStore = useRealtimeStore((state) => state.reset);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      resetRuntimeFriendService();
      resetStore();
      unsubscribeFromGroupInviteEvents();
      unsubscribeFromGroupEvents();
      return;
    }

    let isCancelled = false;
    let cleanupFriendRealtime = () => {};
    let cleanupSocketNotifications = () => {};

    // Subscribe to group invite events (global)
    subscribeToGroupInviteEvents(user.id);
    
    // Subscribe to conversation events (global)
    subscribeToGroupEvents();

    const bootRealtime = async () => {
      try {
        setHydrating(true);
        const snapshot = await fetchRuntimeFriendSnapshot();
        if (!isCancelled) {
          setFriendSnapshot(snapshot);
        }

        const friendService = await getRuntimeFriendService();
        cleanupFriendRealtime = friendService.subscribeRealtime({
          onFriendRequestSend: (payload) => {
            const requester = payload.requester || payload.request?.requester;
            const requesterId = requester?.id || payload.actorUserId || payload.request?.requesterId || '';
            const targetId = payload.targetUserId || payload.request?.targetUserId || '';

            const record = payload.request || {
              id: payload.requestId || buildEventId('req'),
              requesterId,
              targetUserId: targetId,
              requester: requester ? {
                id: requester.id,
                fullName: requester.fullName,
                avatarUrl: requester.avatarUrl,
                phone: requester.phone,
              } : undefined,
              status: 'pending' as const,
              createdAt: payload.createdAt || new Date().toISOString(),
            };

            if (targetId === user.id || (!targetId && requesterId !== user.id)) {
              upsertReceivedRequest(record);
            } else if (requesterId === user.id) {
              upsertSentRequest(record);
            }
          },
          onFriendRequestRespond: (payload) => {
            removeRequest(payload.requestId);
            const action = payload.status || payload.action;
            if (action === 'accepted' || action === 'accept') {
              const addressee = payload.addressee || payload.friend;
              if (addressee) {
                upsertFriend({
                  id: addressee.id,
                  fullName: addressee.fullName || '',
                  avatarUrl: addressee.avatarUrl,
                });
              }
            }
          },
          onFriendRequestCancel: ({ requestId }) => {
            removeRequest(requestId);
          },
          onFriendRemoved: (payload) => {
            const id = payload.userId || payload.friendId || '';
            if (id) removeFriend(id);
          },
        });

        const socket = await getRealtimeSocket();
        cleanupSocketNotifications = () => {
        };
      } catch (error) {
      } finally {
        if (!isCancelled) {
          setHydrating(false);
        }
      }
    };

    bootRealtime();

    return () => {
      isCancelled = true;
      cleanupFriendRealtime();
      cleanupSocketNotifications();
      unsubscribeFromGroupInviteEvents();
      unsubscribeFromGroupEvents();
    };
  }, [
    isAuthenticated,
    removeFriend,
    removeRequest,
    resetStore,
    setFriendSnapshot,
    setHydrating,
    upsertFriend,
    upsertReceivedRequest,
    upsertSentRequest,
    user?.id,
  ]);

  return null;
}


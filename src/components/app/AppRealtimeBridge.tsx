import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getRealtimeSocket } from "../../services/realtime/defaultRealtimeClients";
import {
  fetchRuntimeFriendSnapshot,
  getRuntimeFriendService,
  resetRuntimeFriendService,
} from "../../services/realtime/runtimeFriendService";
import { useRealtimeStore } from "../../store/useRealtimeStore";
import { subscribeToGroupEvents, unsubscribeFromGroupEvents, setCurrentUserId } from "../../services/groupEventsHandler";
import { isRetryableRequestError } from "../../utils/networkUtils";

const buildEventId = (prefix: string, suffix?: string | number) =>
  `${prefix}:${String(suffix || Date.now())}`;

export function AppRealtimeBridge() {
  const { isAuthenticated, user, isLoggingOut } = useAuth();
  const setHydrating = useRealtimeStore((state) => state.setHydrating);
  const setHydrationError = useRealtimeStore((state) => state.setHydrationError);
  const setFriendSnapshot = useRealtimeStore((state) => state.setFriendSnapshot);
  const upsertFriend = useRealtimeStore((state) => state.upsertFriend);
  const removeFriend = useRealtimeStore((state) => state.removeFriend);
  const upsertReceivedRequest = useRealtimeStore((state) => state.upsertReceivedRequest);
  const upsertSentRequest = useRealtimeStore((state) => state.upsertSentRequest);
  const removeRequest = useRealtimeStore((state) => state.removeRequest);
    const resetStore = useRealtimeStore((state) => state.reset);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || isLoggingOut) {
      resetRuntimeFriendService();
      resetStore();
      unsubscribeFromGroupEvents();
      setCurrentUserId('');
      return;
    }

    let isCancelled = false;
    let cleanupFriendRealtime = () => {};
    let cleanupSocketNotifications = () => {};

    // Set current user ID for socket handlers
    setCurrentUserId(user.id);

    // Subscribe to conversation events (global) - includes group invite events
    subscribeToGroupEvents();

    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000;

    const loadFriendSnapshot = async (attempt = 0): Promise<void> => {
      if (isCancelled || !isAuthenticated) return;

      setHydrating(true);
      setHydrationError(null);

      try {
        const snapshot = await fetchRuntimeFriendSnapshot();
        if (!isCancelled) {
          setFriendSnapshot(snapshot);
        }
      } catch (error: any) {
        const shouldRetry = attempt < MAX_RETRIES && isRetryableRequestError(error);
        console.error(
          `[AppRealtimeBridge] Friend snapshot failed (${attempt + 1}/${MAX_RETRIES + 1}):`,
          error?.message || error,
        );

        if (shouldRetry && !isCancelled && isAuthenticated) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return loadFriendSnapshot(attempt + 1);
        }

        if (!isCancelled) {
          setHydrationError(error?.message || 'Failed to load friend data');
          setHydrating(false);
        }
        throw error;
      }

      if (!isCancelled) {
        setHydrating(false);
      }
    };

    const bootRealtime = async () => {
      try {
        await loadFriendSnapshot();

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
        console.warn('[AppRealtimeBridge] Realtime boot partial failure:', error);
      }
    };

    bootRealtime();

    return () => {
      isCancelled = true;
      cleanupFriendRealtime();
      cleanupSocketNotifications();
      unsubscribeFromGroupEvents();
    };
  }, [
    isAuthenticated,
    removeFriend,
    removeRequest,
    resetStore,
    setFriendSnapshot,
    setHydrating,
    setHydrationError,
    upsertFriend,
    upsertReceivedRequest,
    upsertSentRequest,
    user?.id,
    isLoggingOut,
  ]);

  return null;
}


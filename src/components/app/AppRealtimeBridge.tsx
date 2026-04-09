import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getRealtimeSocket } from "../../services/realtime/defaultRealtimeClients";
import {
  fetchRuntimeFriendSnapshot,
  getRuntimeFriendService,
  resetRuntimeFriendService,
} from "../../services/realtime/runtimeFriendService";
import { useRealtimeStore } from "../../store/useRealtimeStore";

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
      return;
    }

    let isCancelled = false;
    let cleanupFriendRealtime = () => {};
    let cleanupSocketNotifications = () => {};

    const bootRealtime = async () => {
      try {
        setHydrating(true);
        const snapshot = await fetchRuntimeFriendSnapshot();
        if (!isCancelled) {
          setFriendSnapshot(snapshot);
        }

        const friendService = await getRuntimeFriendService();
        cleanupFriendRealtime = friendService.subscribeRealtime({
          onFriendRequestSend: ({ request, actorUserId, targetUserId }) => {
            const senderId = actorUserId || request.requesterId;
            const recipientId = targetUserId || request.targetUserId;

            if (recipientId === user.id) {
              upsertReceivedRequest(request);
            } else if (senderId === user.id) {
              upsertSentRequest(request);
            }
          },
          onFriendRequestRespond: (payload) => {
            removeRequest(payload.requestId);
            if (payload.action === "accepted" && payload.friend) {
              upsertFriend(payload.friend);
            }
          },
          onFriendRequestCancel: ({ requestId }) => {
            removeRequest(requestId);
          },
          onFriendRemoved: ({ friendId }) => {
            removeFriend(friendId);
          },
        });

        const socket = await getRealtimeSocket();
        cleanupSocketNotifications = () => {
          // No notification handlers needed
        };
      } catch (error) {
        console.warn("AppRealtimeBridge bootstrap failed", error);
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


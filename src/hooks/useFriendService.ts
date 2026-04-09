import { AxiosInstance } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { createFriendService } from "../services/realtime/friendService";
import {
    CreateFriendRequestPayload,
    FriendRecord,
    FriendRequestRecord,
    GetFriendRequestsParams,
    GetFriendsParams,
    RespondToFriendRequestPayload,
} from "../types/realtimeBff";

type UseFriendServiceOptions = {
  httpClient: AxiosInstance;
  socket: Socket;
  currentUserId: string;
  enabled?: boolean;
  apiPrefix?: string;
  initialPage?: number;
  limit?: number;
};

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const uniqueItems = new Map<string, T>();
  items.forEach((item) => {
    uniqueItems.set(item.id, item);
  });
  return Array.from(uniqueItems.values());
};

const removeById = <T extends { id: string }>(items: T[], id: string) =>
  items.filter((item) => item.id !== id);

const deriveFriendFromRequest = (
  request: FriendRequestRecord | undefined,
  currentUserId: string,
): FriendRecord | null => {
  if (!request) return null;

  if (request.requesterId === currentUserId && request.target) {
    return {
      ...request.target,
      friendsSince: request.respondedAt || request.createdAt || null,
    };
  }

  if (request.targetUserId === currentUserId && request.requester) {
    return {
      ...request.requester,
      friendsSince: request.respondedAt || request.createdAt || null,
    };
  }

  return null;
};

export const useFriendService = ({
  httpClient,
  socket,
  currentUserId,
  enabled = true,
  apiPrefix = "/api",
  initialPage = 1,
  limit = 20,
}: UseFriendServiceOptions) => {
  const friendService = useMemo(
    () =>
      createFriendService({
        httpClient,
        socket,
        apiPrefix,
      }),
    [apiPrefix, httpClient, socket],
  );

  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestRecord[]>(
    [],
  );
  const [sentRequests, setSentRequests] = useState<FriendRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(
    async (params?: GetFriendsParams) => {
      const response = await friendService.getFriends({
        page: params?.page || initialPage,
        limit: params?.limit || limit,
      });
      setFriends(response.data);
      return response;
    },
    [friendService, initialPage, limit],
  );

  const loadReceivedRequests = useCallback(
    async (params?: GetFriendRequestsParams) => {
      const response = await friendService.getReceivedRequests({
        page: params?.page || initialPage,
        limit: params?.limit || limit,
      });
      setReceivedRequests((response as any)?.data || []);
      return response;
    },
    [friendService, initialPage, limit],
  );

  const loadSentRequests = useCallback(
    async (params?: GetFriendRequestsParams) => {
      const response = await friendService.getSentRequests({
        page: params?.page || initialPage,
        limit: params?.limit || limit,
      });
      setSentRequests((response as any)?.data || []);
      return response;
    },
    [friendService, initialPage, limit],
  );

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadFriends(),
        loadReceivedRequests(),
        loadSentRequests(),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load friends";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFriends, loadReceivedRequests, loadSentRequests]);

  const sendRequest = useCallback(
    async (payload: CreateFriendRequestPayload) => {
      const response = await friendService.sendFriendRequest(payload);
      const request = response.data;
      if (request) {
        setSentRequests((current) => dedupeById([request, ...current]));
      }
      return response;
    },
    [friendService],
  );

  const respondToRequest = useCallback(
    async (requestId: string, payload: RespondToFriendRequestPayload) => {
      const response = await friendService.respondToFriendRequest(requestId, payload);
      setReceivedRequests((current) => removeById(current, requestId));

      if (payload.action === "accept" || payload.action === "accepted") {
        const nextFriend =
          "friend" in response.data && response.data.friend
            ? response.data.friend
            : deriveFriendFromRequest(
                "request" in response.data ? response.data.request : undefined,
                currentUserId,
              );

        if (nextFriend) {
          setFriends((current) => dedupeById([nextFriend, ...current]));
        }
      }

      return response;
    },
    [currentUserId, friendService],
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      const response = await friendService.cancelFriendRequest(requestId);
      setSentRequests((current) => removeById(current, requestId));
      return response;
    },
    [friendService],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      const response = await friendService.removeFriend(friendId);
      setFriends((current) => removeById(current, friendId));
      return response;
    },
    [friendService],
  );

  const blockUser = useCallback(
    async (userId: string) => {
      const response = await friendService.blockUser(userId);
      setFriends((current) => removeById(current, userId));
      return response;
    },
    [friendService],
  );

  const unblockUser = useCallback(
    async (userId: string) => friendService.unblockUser(userId),
    [friendService],
  );

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = friendService.subscribeRealtime({
      onFriendRequestSend: (payload) => {
        const requester = payload.requester || payload.request?.requester;
        const requesterId = requester?.id || payload.actorUserId || payload.request?.requesterId || '';
        const targetId = payload.targetUserId || payload.request?.targetUserId || '';

        const record: FriendRequestRecord = payload.request || {
          id: payload.requestId || `req-${Date.now()}`,
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

        if (targetId === currentUserId || (!targetId && requesterId !== currentUserId)) {
          setReceivedRequests((current) => dedupeById([record, ...current]));
        }

        if (requesterId === currentUserId) {
          setSentRequests((current) => dedupeById([record, ...current]));
        }
      },
      onFriendRequestRespond: (payload) => {
        const requestId = payload.requestId || payload.request?.id;
        if (requestId) {
          setReceivedRequests((current) => removeById(current, requestId));
          setSentRequests((current) => removeById(current, requestId));
        }

        const action = payload.status || payload.action;
        if (action === 'accepted' || action === 'accept') {
          const addressee = payload.addressee || payload.friend;
          const nextFriend: FriendRecord | null = addressee
            ? { id: addressee.id, fullName: addressee.fullName || '', avatarUrl: addressee.avatarUrl }
            : deriveFriendFromRequest(payload.request, currentUserId);
          if (nextFriend) {
            setFriends((current) => dedupeById([nextFriend, ...current]));
          }
        }
      },
      onFriendRequestCancel: ({ requestId }) => {
        setReceivedRequests((current) => removeById(current, requestId));
        setSentRequests((current) => removeById(current, requestId));
      },
      onFriendRemoved: (payload) => {
        const id = payload.userId || payload.friendId || '';
        if (id) setFriends((current) => removeById(current, id));
      },
    });

    return unsubscribe;
  }, [currentUserId, enabled, friendService]);

  useEffect(() => {
    if (!enabled) return;
    reloadAll().catch(() => null);
  }, [enabled, reloadAll]);

  return {
    friends,
    receivedRequests,
    sentRequests,
    isLoading,
    error,
    reloadAll,
    loadFriends,
    loadReceivedRequests,
    loadSentRequests,
    sendRequest,
    respondToRequest,
    cancelRequest,
    removeFriend,
    blockUser,
    unblockUser,
  };
};

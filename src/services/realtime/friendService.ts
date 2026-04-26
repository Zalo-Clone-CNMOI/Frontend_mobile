import { AxiosError, AxiosInstance } from "axios";
import { Socket } from "socket.io-client";
import {
  ApiEnvelope,
  ApiListEnvelope,
  CreateFriendRequestPayload,
  FriendApiErrorCode,
  FriendApiErrorResponse,
  FriendRealtimeHandlers,
  FriendRecord,
  FriendRemovedPayload,
  FriendRequestAction,
  FriendRequestCancelPayload,
  FriendRequestListKind,
  FriendRequestRecord,
  FriendRequestRespondPayload,
  FriendRequestSendPayload,
  GetFriendRequestsParams,
  GetFriendsParams,
  RespondToFriendRequestPayload,
} from "../../types/realtimeBff";
import { createBffEndpointBuilder } from "./createBffHttpClient";
import {
  RequestRateLimitError,
  RequestRateLimiter,
  defaultRequestRateLimiter,
} from "./requestRateLimiter";

type FriendServiceDependencies = {
  httpClient: AxiosInstance;
  socket: Socket;
  apiPrefix?: string;
  rateLimiter?: RequestRateLimiter;
};

export class FriendServiceError extends Error {
  constructor(
    message: string,
    readonly code: FriendApiErrorCode,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FriendServiceError";
  }
}

const inferFriendErrorCode = (
  status?: number,
  payload?: FriendApiErrorResponse,
): FriendApiErrorCode => {
  const remoteCode = String(payload?.code || "").toUpperCase();
  if (remoteCode === "SELF_REQUEST") return "SELF_REQUEST";
  if (remoteCode === "NOT_FOUND") return "NOT_FOUND";
  if (remoteCode === "ALREADY_EXISTS") return "ALREADY_EXISTS";
  if (remoteCode === "RATE_LIMITED") return "RATE_LIMITED";

  if (status === 400) return "SELF_REQUEST";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "ALREADY_EXISTS";
  if (status === 429) return "RATE_LIMITED";

  return "UNKNOWN";
};

const toFriendServiceError = (error: unknown): FriendServiceError => {
  if (error instanceof FriendServiceError) {
    return error;
  }

  if (error instanceof RequestRateLimitError) {
    return new FriendServiceError(error.message, "RATE_LIMITED", 429);
  }

  if (error instanceof AxiosError) {
    const payload = error.response?.data as FriendApiErrorResponse | undefined;
    const status = error.response?.status;
    const code = inferFriendErrorCode(status, payload);
    const message =
      payload?.message ||
      payload?.error ||
      error.message ||
      "Friend service request failed";
    return new FriendServiceError(message, code, status);
  }

  if (error instanceof Error) {
    return new FriendServiceError(error.message, "UNKNOWN");
  }

  return new FriendServiceError("Unknown friend service error", "UNKNOWN");
};

const normalizePagination = <T extends GetFriendsParams | GetFriendRequestsParams>(
  params?: T,
): Required<T> => {
  return {
    page: params?.page || 1,
    limit: params?.limit || 20,
  } as Required<T>;
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Map<string, T>();
  items.forEach((item) => {
    seen.set(item.id, item);
  });
  return Array.from(seen.values());
};

const buildRequestPath = (
  requestKind: FriendRequestListKind,
  buildEndpoint: (path: string) => string,
) => {
  if (requestKind === "sent") {
    return buildEndpoint("/friends/requests/sent");
  }
  return buildEndpoint("/friends/requests/pending");
};

export const createFriendService = ({
  httpClient,
  socket,
  apiPrefix = "/api",
  rateLimiter = defaultRequestRateLimiter,
}: FriendServiceDependencies) => {
  const endpoint = createBffEndpointBuilder(apiPrefix);

  const withErrorMapping = async <T>(task: () => Promise<T>) => {
    try {
      return await task();
    } catch (error) {
      throw toFriendServiceError(error);
    }
  };

  const getFriends = (params?: GetFriendsParams) =>
    withErrorMapping(async () => {
      rateLimiter.consume("get");
      const response = await httpClient.get<ApiListEnvelope<FriendRecord>>(
        endpoint("/friends"),
        { params: normalizePagination(params) },
      );
      return response.data;
    });

  const getFriendRequests = (
    kind: FriendRequestListKind,
    params?: GetFriendRequestsParams,
  ) =>
    withErrorMapping(async () => {
      rateLimiter.consume("get");
      
      try {
        const response = await httpClient.get<ApiListEnvelope<FriendRequestRecord>>(
          buildRequestPath(kind, endpoint),
          { params: normalizePagination(params) },
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        
        throw toFriendServiceError(error);
      }
    });

  const sendFriendRequest = (payload: CreateFriendRequestPayload) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const url = endpoint("/friends/requests");
      const response = await httpClient.post<ApiEnvelope<FriendRequestRecord>>(
        url,
        payload,
      );
      return response.data;
    });

  const respondToFriendRequest = (
    requestId: string,
    payload: RespondToFriendRequestPayload,
  ) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const response = await httpClient.patch<
        ApiEnvelope<FriendRequestRecord | FriendRequestRespondPayload>
      >(endpoint(`/friends/requests/${requestId}`), payload);
      return response.data;
    });

  const cancelFriendRequest = (requestId: string) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const response = await httpClient.delete<ApiEnvelope<{ id: string }>>(
        endpoint(`/friends/requests/${requestId}`),
      );
      return response.data;
    });

  const removeFriend = (friendId: string) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const response = await httpClient.delete<ApiEnvelope<{ id: string }>>(
        endpoint(`/friends/${friendId}`),
      );
      return response.data;
    });

  const blockUser = (userId: string) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const response = await httpClient.post<ApiEnvelope<{ userId: string }>>(
        endpoint(`/friends/${userId}/block`),
      );
      return response.data;
    });

  const unblockUser = (userId: string) =>
    withErrorMapping(async () => {
      rateLimiter.consume("mutation");
      const response = await httpClient.delete<ApiEnvelope<{ userId: string }>>(
        endpoint(`/friends/${userId}/block`),
      );
      return response.data;
    });

  const subscribeRealtime = (handlers: FriendRealtimeHandlers) => {
    const handleRequestSend = (payload: FriendRequestSendPayload) => {
      handlers.onFriendRequestSend?.(payload);
    };

    const handleRequestRespond = (payload: FriendRequestRespondPayload) => {
      handlers.onFriendRequestRespond?.(payload);
    };

    const handleRequestCancel = (payload: FriendRequestCancelPayload) => {
      handlers.onFriendRequestCancel?.(payload);
    };

    const handleFriendRemoved = (payload: FriendRemovedPayload) => {
      handlers.onFriendRemoved?.(payload);
    };

    socket.on("friend:request:send", handleRequestSend);
    socket.on("friend:request:respond", handleRequestRespond);
    socket.on("friend:request:cancel", handleRequestCancel);
    socket.on("friend:removed", handleFriendRemoved);

    return () => {
      socket.off("friend:request:send", handleRequestSend);
      socket.off("friend:request:respond", handleRequestRespond);
      socket.off("friend:request:cancel", handleRequestCancel);
      socket.off("friend:removed", handleFriendRemoved);
    };
  };

  return {
    getFriends,
    getReceivedRequests: (params?: GetFriendRequestsParams) =>
      getFriendRequests("received", params),
    getSentRequests: (params?: GetFriendRequestsParams) =>
      getFriendRequests("sent", params),
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    subscribeRealtime,
    dedupeFriends: (friends: FriendRecord[]) => uniqueById(friends),
    dedupeRequests: (requests: FriendRequestRecord[]) => uniqueById(requests),
  };
};

export type FriendService = ReturnType<typeof createFriendService>;

export const isFriendRequestAccepted = (
  action: FriendRequestAction | undefined,
) => action === "accepted" || action === "accept";

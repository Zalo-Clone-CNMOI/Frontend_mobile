import { useRealtimeStore } from "../../store/useRealtimeStore";
import { getCurrentUser } from "../authService";
import { getRuntimeFriendService } from "./runtimeFriendService";

const deriveFriendFromRequest = (request: any, currentUserId?: string) => {
  if (!request || !currentUserId) return null;
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

export const sendRuntimeFriendRequest = async (targetUserId: string) => {
  const service = await getRuntimeFriendService();
  const response = await service.sendFriendRequest({ userId: targetUserId });
  if (response.data) {
    useRealtimeStore.getState().upsertSentRequest(response.data);
  }
  return response;
};

export const respondRuntimeFriendRequest = async (
  requestId: string,
  action: "accepted" | "rejected",
) => {
  const service = await getRuntimeFriendService();
  const response = await service.respondToFriendRequest(requestId, { action });
  const currentUser = await getCurrentUser();
  useRealtimeStore.getState().removeRequest(requestId);

  if (action === "accepted") {
    const payload = response.data as any;
    const nextFriend = payload.friend || deriveFriendFromRequest(payload.request, currentUser?.id);
    if (nextFriend) {
      useRealtimeStore.getState().upsertFriend(nextFriend);
    }
  }

  return response;
};

export const cancelRuntimeFriendRequest = async (requestId: string) => {
  const service = await getRuntimeFriendService();
  const response = await service.cancelFriendRequest(requestId);
  useRealtimeStore.getState().removeRequest(requestId);
  return response;
};

export const removeRuntimeFriend = async (friendId: string) => {
  const service = await getRuntimeFriendService();
  const response = await service.removeFriend(friendId);
  useRealtimeStore.getState().removeFriend(friendId);
  return response;
};

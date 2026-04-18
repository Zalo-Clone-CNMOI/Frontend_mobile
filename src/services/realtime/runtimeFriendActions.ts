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

export const sendRuntimeFriendRequest = async (targetUserId: string, message?: string) => {
  console.log('[sendRuntimeFriendRequest] Sending request to:', targetUserId);
  const service = await getRuntimeFriendService();
  const payload = {
    userId: targetUserId,
    message: message?.trim() || "Hi, I would like to add you as a friend!",
  };
  console.log('[sendRuntimeFriendRequest] Payload:', payload);
  const response = await service.sendFriendRequest(payload);
  console.log('[sendRuntimeFriendRequest] Response:', response);
  if (response.data) {
    useRealtimeStore.getState().upsertSentRequest(response.data);
  }
  return response;
};

export const respondRuntimeFriendRequest = async (
  requestId: string,
  action: "accept" | "reject",
) => {
  const service = await getRuntimeFriendService();
  const response = await service.respondToFriendRequest(requestId, { action });
  const currentUser = await getCurrentUser();
  useRealtimeStore.getState().removeRequest(requestId);

  if (action === "accept") {
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

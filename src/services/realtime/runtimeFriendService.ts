import { ApiListEnvelope, FriendRecord, FriendRequestRecord } from "../../types/realtimeBff";
import { getRealtimeHttpClient, getRealtimeSocket } from "./defaultRealtimeClients";
import { FriendService, createFriendService } from "./friendService";

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/' + avatar.replace(/^\//, '');
};

const normalizeProfileAvatar = (profile: any): any => {
  if (!profile) return profile;
  return {
    ...profile,
    avatarUrl: normalizeAvatarUrl(profile?.avatarUrl || profile?.avatar),
  };
};

let runtimeFriendServicePromise: Promise<FriendService> | null = null;

export const getRuntimeFriendService = async (): Promise<FriendService> => {
  if (!runtimeFriendServicePromise) {
    runtimeFriendServicePromise = (async () => {
      const socket = await getRealtimeSocket();
      return createFriendService({
        httpClient: getRealtimeHttpClient(),
        socket,
      });
    })();
  }

  return runtimeFriendServicePromise;
};

export const resetRuntimeFriendService = () => {
  runtimeFriendServicePromise = null;
};

export const fetchRuntimeFriendSnapshot = async () => {
  const service = await getRuntimeFriendService();
  
  const [friendsResponse, receivedResponse, sentResponse] = await Promise.all([
    service.getFriends({ page: 1, limit: 100 }),
    service.getReceivedRequests({ page: 1, limit: 100 }),
    service.getSentRequests({ page: 1, limit: 100 }),
  ]);

  const friends = ((friendsResponse as ApiListEnvelope<FriendRecord>)?.data || []).map((friend: any) => ({
    ...friend,
    user: normalizeProfileAvatar(friend.user),
  }));

  const receivedRequests = ((receivedResponse as ApiListEnvelope<FriendRequestRecord>)?.data || []).map((req: any) => ({
    ...req,
    requester: normalizeProfileAvatar(req.requester),
  }));

  const sentRequests = ((sentResponse as ApiListEnvelope<FriendRequestRecord>)?.data || []).map((req: any) => ({
    ...req,
    target: normalizeProfileAvatar(req.target),
  }));

  return {
    friends,
    receivedRequests,
    sentRequests,
  };
};

import { ApiListEnvelope, FriendRecord, FriendRequestRecord } from "../../types/realtimeBff";
import { getRealtimeHttpClient, getRealtimeSocket } from "./defaultRealtimeClients";
import { FriendService, createFriendService } from "./friendService";

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

  return {
    friends: (friendsResponse as ApiListEnvelope<FriendRecord>)?.data || [],
    receivedRequests: (receivedResponse as ApiListEnvelope<FriendRequestRecord>)?.data || [],
    sentRequests: (sentResponse as ApiListEnvelope<FriendRequestRecord>)?.data || [],
  };
};

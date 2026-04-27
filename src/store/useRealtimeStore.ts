import { create } from "zustand";
import {
  FriendRecord,
  FriendRequestRecord,
} from "../types/realtimeBff";

type RealtimeStoreState = {
  friends: FriendRecord[];
  receivedRequests: FriendRequestRecord[];
  sentRequests: FriendRequestRecord[];
  isHydrating: boolean;
  hydrationError: string | null;
  setHydrating: (value: boolean) => void;
  setHydrationError: (error: string | null) => void;
  setFriendSnapshot: (payload: {
    friends: FriendRecord[];
    receivedRequests: FriendRequestRecord[];
    sentRequests: FriendRequestRecord[];
  }) => void;
  upsertFriend: (friend: FriendRecord) => void;
  removeFriend: (friendId: string) => void;
  upsertReceivedRequest: (request: FriendRequestRecord) => void;
  upsertSentRequest: (request: FriendRequestRecord) => void;
  removeRequest: (requestId: string) => void;
  reset: () => void;
};

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const uniqueItems = new Map<string, T>();
  items.forEach((item) => {
    uniqueItems.set(item.id, item);
  });
  return Array.from(uniqueItems.values());
};

export const useRealtimeStore = create<RealtimeStoreState>((set) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  isHydrating: false,
  hydrationError: null,
  setHydrating: (value) => set({ isHydrating: value }),
  setHydrationError: (error) => set({ hydrationError: error }),
  setFriendSnapshot: ({ friends, receivedRequests, sentRequests }) =>
    set({
      friends: dedupeById(friends),
      receivedRequests: dedupeById(receivedRequests),
      sentRequests: dedupeById(sentRequests),
    }),
  upsertFriend: (friend) =>
    set((state) => ({
      friends: dedupeById([friend, ...state.friends]),
    })),
  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((friend) => friend.id !== friendId),
    })),
  upsertReceivedRequest: (request) =>
    set((state) => ({
      receivedRequests: dedupeById([request, ...state.receivedRequests]),
    })),
  upsertSentRequest: (request) =>
    set((state) => ({
      sentRequests: dedupeById([request, ...state.sentRequests]),
    })),
  removeRequest: (requestId) =>
    set((state) => ({
      receivedRequests: state.receivedRequests.filter((item) => item.id !== requestId),
      sentRequests: state.sentRequests.filter((item) => item.id !== requestId),
    })),
  reset: () =>
    set({
      friends: [],
      receivedRequests: [],
      sentRequests: [],
      isHydrating: false,
      hydrationError: null,
    }),
}));



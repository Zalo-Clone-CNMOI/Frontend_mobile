import { useEffect, useCallback } from 'react';
import { useGroupInviteStore } from '../store/useGroupInviteStore';
import { 
  sendGroupInvites, 
  getConversationInvites,
  SendGroupInvitesRequest,
  GroupInviteDTO,
  GroupInviteStatus,
} from '../services/groupInviteApi';
import { 
  subscribeToGroupInviteEvents, 
  unsubscribeFromGroupInviteEvents 
} from '../services/groupInviteSocketHandler';

interface UseGroupInviteOptions {
  userId?: string;
  conversationId?: string; // For fetching conversation-specific invites
  autoFetch?: boolean;
  autoSubscribeSocket?: boolean;
}

interface UseGroupInviteReturn {
  // State - Received invites (for inviteCenter)
  receivedInvites: {
    pending: GroupInviteDTO[];
    accepted: GroupInviteDTO[];
    rejected: GroupInviteDTO[];
    cancelled: GroupInviteDTO[];
    expired: GroupInviteDTO[];
  };
  // State - Sent invites (for groupInvite screen)
  sentInvites: {
    pending: GroupInviteDTO[];
    accepted: GroupInviteDTO[];
    rejected: GroupInviteDTO[];
    cancelled: GroupInviteDTO[];
    expired: GroupInviteDTO[];
  };
  unreadCount: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Actions
  fetchPendingInvites: (force?: boolean) => Promise<void>;
  fetchConversationInvites: (conversationId: string, status?: GroupInviteStatus) => Promise<void>;
  sendInvites: (conversationId: string, payload: SendGroupInvitesRequest) => Promise<void>;
  acceptInvite: (conversationId: string, inviteId: string) => Promise<void>;
  rejectInvite: (conversationId: string, inviteId: string) => Promise<void>;
  cancelInvite: (conversationId: string, inviteId: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook quản lý Group Invites - Tích hợp API + Socket
 * 
 * Luồng dữ liệu:
 * 1. Gửi lời mời: Component → sendInvites(API) → Server → Kafka → Socket → Recipient
 * 2. Nhận lời mời: Server → Socket → handleInviteSent → Store → UI update
 * 3. Phản hồi lời mời: Component → accept/reject(API) → Optimistic update → Server → Socket
 */
export const useGroupInvite = (options: UseGroupInviteOptions = {}): UseGroupInviteReturn => {
  const { userId, autoFetch = true, autoSubscribeSocket = true } = options;
  
  // Get state from store
  const {
    unreadCount,
    isLoading,
    isSending,
    error,
    receivedInvites,
    sentInvites,
    fetchPendingInvites: storeFetchPending,
    fetchConversationInvites: storeFetchConversationInvites,
    acceptInvite: storeAcceptInvite,
    rejectInvite: storeRejectInvite,
    cancelInvite: storeCancelInvite,
    markSending,
    reset,
  } = useGroupInviteStore();

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      storeFetchPending({ force: false });
    }
  }, [autoFetch]); // Remove storeFetchPending from dependencies

  // Auto-subscribe to socket events
  useEffect(() => {
    if (autoSubscribeSocket) {
      subscribeToGroupInviteEvents(userId);
      
      return () => {
        unsubscribeFromGroupInviteEvents();
      };
    }
  }, [autoSubscribeSocket, userId]);

  /**
   * Send group invites
   * Flow: API → Server → Kafka → Socket (recipient nhận realtime)
   */
  const sendInvites = useCallback(async (
    conversationId: string, 
    payload: SendGroupInvitesRequest
  ): Promise<void> => {
    markSending(true);
    try {
      const response = await sendGroupInvites(conversationId, payload);
      
      // Không cần optimistic update vì người nhận sẽ nhận qua socket
      // Người gửi (current user) không cần update UI vì họ đang ở màn hình gửi lời mời
    } finally {
      markSending(false);
    }
  }, [markSending]);

  /**
   * Accept invite with optimistic update
   * Flow: Optimistic update → API → Server → Socket
   */
  const acceptInvite = useCallback(async (
    conversationId: string, 
    inviteId: string
  ) => {
    await storeAcceptInvite(conversationId, inviteId);
  }, [storeAcceptInvite]);

  /**
   * Reject invite with optimistic update
   */
  const rejectInvite = useCallback(async (
    conversationId: string, 
    inviteId: string
  ) => {
    await storeRejectInvite(conversationId, inviteId);
  }, [storeRejectInvite]);

  /**
   * Cancel invite with optimistic update
   */
  const cancelInvite = useCallback(async (
    conversationId: string, 
    inviteId: string
  ) => {
    await storeCancelInvite(conversationId, inviteId);
  }, [storeCancelInvite]);

  /**
   * Fetch pending invites with force option
   */
  const fetchPendingInvites = useCallback(async (force = false) => {
    await storeFetchPending({ force });
  }, [storeFetchPending]);

  /**
   * Fetch conversation invites (for admin/owner to manage invites)
   */
  const fetchConversationInvites = useCallback(async (conversationId: string, status?: GroupInviteStatus) => {
    await storeFetchConversationInvites(conversationId, status);
  }, [storeFetchConversationInvites]);

  return {
    // State
    receivedInvites,
    sentInvites,
    unreadCount,
    isLoading,
    isSending,
    error,
    // Actions
    fetchPendingInvites,
    fetchConversationInvites,
    sendInvites,
    acceptInvite,
    rejectInvite,
    cancelInvite,
    reset,
  };
};

export default useGroupInvite;

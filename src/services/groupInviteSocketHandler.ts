import { getSocket } from './socket';
import { useGroupInviteStore } from '../store/useGroupInviteStore';
import { GroupInviteDTO } from './groupInviteApi';

// WebSocket Event Names (matching Backend WsEvents)
const WS_EVENTS = {
  GroupInviteSent: 'group:invite:sent',
  GroupInviteAccepted: 'group:invite:accepted',
  GroupInviteRejected: 'group:invite:rejected',
  GroupInviteCancelled: 'group:invite:cancelled',
  GroupInviteExpired: 'group:invite:expired',
} as const;

// Payload interfaces (matching Backend WebSocket payloads - snake_case)
// Reference: Backend/libs/contracts/src/ws/events.ts
interface WsGroupInviteSentPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  inviter_full_name: string;
  conversation_name: string | null;
  message: string | null;
  expires_at: number; // timestamp in ms
  sent_at: number; // timestamp in ms
  trace_id?: string; // used for idempotency
}

interface WsGroupInviteAcceptedPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'accepted';
  responded_at: number;
  trace_id?: string;
}

interface WsGroupInviteRejectedPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'rejected';
  responded_at: number;
  trace_id?: string;
}

interface WsGroupInviteCancelledPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'cancelled';
  cancelled_at: number;
  trace_id?: string;
}

interface WsGroupInviteExpiredPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'expired';
  expired_at: number;
  trace_id?: string;
}

// Get current user ID from auth context/store
const getCurrentUserId = (): string | null => {
  // This should be implemented based on your auth state management
  // For now, return null - the component should pass userId or use AuthContext
  return null;
};

/**
 * Subscribe to group invite WebSocket events
 * Call this when user logs in or app starts
 */
export const subscribeToGroupInviteEvents = (currentUserId?: string) => {
  const socket = getSocket();
  if (!socket) {
    return;
  }

  const userId = currentUserId || getCurrentUserId();
  const store = useGroupInviteStore.getState();

  // ==================== Group Invite Sent ====================
  // Received by: Invited user
  // When: Someone sends an invite to current user
  socket.on(WS_EVENTS.GroupInviteSent, (payload: WsGroupInviteSentPayload) => {
    // Only process if current user is the invited user
    if (userId && payload.invited_user_id !== userId) {
      return;
    }

    // Convert WebSocket payload to Invite DTO
    const invite: GroupInviteDTO = {
      id: payload.invite_id,
      conversationId: payload.conversation_id,
      inviterUserId: payload.inviter_id,
      invitedUserId: payload.invited_user_id,
      status: 'pending',
      message: payload.message,
      expiresAt: new Date(payload.expires_at).toISOString(),
      createdAt: new Date(payload.sent_at).toISOString(),
      respondedAt: null,
      conversation: {
        id: payload.conversation_id,
        name: payload.conversation_name,
        avatarUrl: null,
        memberCount: 0, // Will be filled when fetched
      },
      inviter: {
        id: payload.inviter_id,
        fullName: payload.inviter_full_name,
        avatarUrl: null,
      },
    };

    // Use store handler with idempotency check
    store.handleInviteSent(invite, payload.trace_id);
  });

  // ==================== Group Invite Accepted ====================
  // Received by: Inviter and Invited user
  // When: Invited user accepts the invite
  socket.on(WS_EVENTS.GroupInviteAccepted, (payload: WsGroupInviteAcceptedPayload) => {
    // Update invite status in store
    const respondedAt = payload.responded_at 
      ? new Date(payload.responded_at).toISOString() 
      : new Date().toISOString();
    
    store.handleInviteAccepted(payload.invite_id, respondedAt, payload.trace_id);
  });

  // ==================== Group Invite Rejected ====================
  // Received by: Inviter
  // When: Invited user rejects the invite
  socket.on(WS_EVENTS.GroupInviteRejected, (payload: WsGroupInviteRejectedPayload) => {
    const respondedAt = payload.responded_at 
      ? new Date(payload.responded_at).toISOString() 
      : new Date().toISOString();
    
    store.handleInviteRejected(payload.invite_id, respondedAt, payload.trace_id);
  });

  // ==================== Group Invite Cancelled ====================
  // Received by: Invited user
  // When: Inviter or admin cancels the invite
  socket.on(WS_EVENTS.GroupInviteCancelled, (payload: WsGroupInviteCancelledPayload) => {
    const cancelledAt = payload.cancelled_at 
      ? new Date(payload.cancelled_at).toISOString() 
      : new Date().toISOString();
    
    store.handleInviteCancelled(payload.invite_id, cancelledAt, payload.trace_id);
  });

  // ==================== Group Invite Expired ====================
  // Received by: Inviter and Invited user
  // When: Invite expires automatically
  socket.on(WS_EVENTS.GroupInviteExpired, (payload: WsGroupInviteExpiredPayload) => {
    const expiredAt = payload.expired_at 
      ? new Date(payload.expired_at).toISOString() 
      : new Date().toISOString();
    
    store.handleInviteExpired(payload.invite_id, expiredAt, payload.trace_id);
  });
};

/**
 * Unsubscribe from group invite WebSocket events
 * Call this on logout or cleanup
 */
export const unsubscribeFromGroupInviteEvents = () => {
  const socket = getSocket();
  if (!socket) return;

  socket.off(WS_EVENTS.GroupInviteSent);
  socket.off(WS_EVENTS.GroupInviteAccepted);
  socket.off(WS_EVENTS.GroupInviteRejected);
  socket.off(WS_EVENTS.GroupInviteCancelled);
  socket.off(WS_EVENTS.GroupInviteExpired);
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  const socket = getSocket();
  return socket?.connected || false;
};

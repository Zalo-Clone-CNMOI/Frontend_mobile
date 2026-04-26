import { getSocket } from './socket';
import { WsEvents, ConversationCreatedPayload, ConversationUpdatedPayload, ConversationDisbandedPayload, ConversationMemberAddedPayload, ConversationMemberRemovedPayload, ConversationMemberRoleUpdatedPayload, GroupInviteSentPayload, GroupInviteStatusPayload } from '../realtime/events';
import { useGroupInviteStore } from '../store/useGroupInviteStore';
import { useConversationDetailStore } from '../store/useConversationDetailStore';
import { useChatsStore } from '../store/useChatsStore';
import { useAuth } from '../contexts/AuthContext';

// Track processed events for idempotency
const processedEvents = new Map<string, number>();
const EVENT_ID_TTL = 5 * 60 * 1000; // 5 minutes

// Cached user ID for use outside React context
let cachedUserId: string | null = null;

// Set current user ID (call this from React context)
export const setCurrentUserId = (userId: string) => {
  cachedUserId = userId;
};

// Get current user ID from cache
const getCurrentUserId = (): string | null => {
  return cachedUserId;
};

// Cleanup expired event IDs
const cleanupExpiredEventIds = () => {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_ID_TTL) {
      processedEvents.delete(eventId);
    }
  }
};

// Check if event was already processed
const isEventProcessed = (eventId: string): boolean => {
  cleanupExpiredEventIds();
  return processedEvents.has(eventId);
};

// Mark event as processed
const markEventProcessed = (eventId: string) => {
  processedEvents.set(eventId, Date.now());
};

export const subscribeToGroupEvents = () => {
  const socket = getSocket();
  if (!socket) {
    return;
  }

  const groupInviteStore = useGroupInviteStore.getState();
  const conversationDetailStore = useConversationDetailStore.getState();
  const chatsStore = useChatsStore.getState();
  const currentUserId = getCurrentUserId();

  // ==================== Conversation Events ====================

  // conversation:created
  socket.on(WsEvents.ConversationCreated, (payload: ConversationCreatedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `conv-created:${payload.conversation_id}`;
    if (isEventProcessed(id)) return;
    
    // Check if current user is in members
    const isMember = payload.members.some((m) => m.user_id === currentUserId);
    if (isMember) {
      // Add to conversation list
      chatsStore.addChat({
        conversationId: payload.conversation_id,
        name: payload.name || '',
        avatar: payload.avatar_url,
        type: payload.type,
        isGroup: payload.type === 'group',
        memberCount: payload.members.length,
        lastMessageAt: payload.created_at,
        unreadCount: 0,
      });

      // Cache conversation detail
      conversationDetailStore.cache[payload.conversation_id] = {
        conversation: {
          id: payload.conversation_id,
          type: payload.type,
          name: payload.name || '',
          avatarUrl: payload.avatar_url,
          createdById: payload.created_by,
          createdAt: new Date(payload.created_at).toISOString(),
          memberCount: payload.members.length,
        },
        members: payload.members.map((m) => ({
          id: m.user_id,
          userId: m.user_id,
          fullName: m.full_name,
          avatarUrl: m.avatar_url,
          role: m.role,
          joinedAt: new Date(payload.created_at).toISOString(),
          leftAt: null,
        })),
        mySettings: {
          role: payload.members.find((m) => m.user_id === currentUserId)?.role || 'member',
        },
        cachedAt: Date.now(),
      };
    }
    markEventProcessed(id);
  });

  // conversation:updated
  socket.on(WsEvents.ConversationUpdated, (payload: ConversationUpdatedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `conv-updated:${payload.conversation_id}:${payload.updated_at}`;
    if (isEventProcessed(id)) return;
    
    // Update in conversation list
    chatsStore.updateChat(payload.conversation_id, {
      name: payload.name || '',
      avatar: payload.avatar_url,
    });

    // Update in conversation detail cache
    conversationDetailStore.updateConversation(payload.conversation_id, {
      name: payload.name || '',
      avatarUrl: payload.avatar_url,
      updatedAt: new Date(payload.updated_at).toISOString(),
    });
    markEventProcessed(id);
  });

  // conversation:disbanded
  socket.on(WsEvents.ConversationDisbanded, (payload: ConversationDisbandedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `conv-disbanded:${payload.conversation_id}`;
    if (isEventProcessed(id)) return;
    
    // Remove from conversation list
    chatsStore.deleteChat(payload.conversation_id);

    // Invalidate cache
    conversationDetailStore.invalidateCache(payload.conversation_id);

    // TODO: Show toast/notification to user
    // TODO: If user is in chat screen, navigate back to conversation list
    markEventProcessed(id);
  });

  // conversation:member:added
  socket.on(WsEvents.ConversationMemberAdded, (payload: ConversationMemberAddedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `member-added:${payload.conversation_id}:${payload.added_at}`;
    if (isEventProcessed(id)) return;
    
    const addedUserIds = payload.members.map((m) => m.user_id);
    
    if (addedUserIds.includes(currentUserId || '')) {
      // Current user was added to conversation
      // Add to conversation list
      chatsStore.addChat({
        conversationId: payload.conversation_id,
        name: '', // Will be updated when conversation detail is fetched
        type: 'group',
        isGroup: true,
        memberCount: 0,
        lastMessageAt: Date.now(),
        unreadCount: 0,
      });

      // Invalidate cache to fetch fresh data
      conversationDetailStore.invalidateCache(payload.conversation_id);

      // TODO: Navigate to chat screen if user is in conversation list
    } else {
      // Another member was added
      // Update member count in conversation list
      const existingChat = chatsStore.chats.find((c) => c.conversationId === payload.conversation_id);
      if (existingChat) {
        chatsStore.updateChat(payload.conversation_id, {
          memberCount: (existingChat.memberCount || 0) + payload.members.length,
        });
      }

      // Add members to conversation detail cache
      for (const member of payload.members) {
        conversationDetailStore.addMember(payload.conversation_id, {
          id: member.user_id,
          userId: member.user_id,
          fullName: member.full_name,
          avatarUrl: member.avatar_url,
          role: member.role,
          joinedAt: new Date(payload.added_at).toISOString(),
          leftAt: null,
        });
      }
    }
    markEventProcessed(id);
  });

  // conversation:member:removed
  socket.on(WsEvents.ConversationMemberRemoved, (payload: ConversationMemberRemovedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `member-removed:${payload.conversation_id}:${payload.removed_user_id}`;
    if (isEventProcessed(id)) return;
    
    if (payload.removed_user_id === currentUserId) {
      // Current user was removed from conversation
      // Remove from conversation list
      chatsStore.deleteChat(payload.conversation_id);

      // Invalidate cache
      conversationDetailStore.invalidateCache(payload.conversation_id);

      // TODO: If user is in chat screen, navigate back to conversation list
    } else {
      // Another member was removed
      // Update member count in conversation list
      const existingChat = chatsStore.chats.find((c) => c.conversationId === payload.conversation_id);
      if (existingChat) {
        chatsStore.updateChat(payload.conversation_id, {
          memberCount: Math.max(0, (existingChat.memberCount || 0) - 1),
        });
      }

      // Remove member from conversation detail cache
      conversationDetailStore.removeMember(payload.conversation_id, payload.removed_user_id);
    }
    markEventProcessed(id);
  });

  // conversation:member:role:updated
  socket.on(WsEvents.ConversationMemberRoleUpdated, (payload: ConversationMemberRoleUpdatedPayload, eventId?: string) => {
    // Idempotency check
    const id = eventId || `role-updated:${payload.conversation_id}:${payload.user_id}:${payload.updated_at}`;
    if (isEventProcessed(id)) return;

    if (payload.user_id === currentUserId) {
      // Current user's role was updated
      console.log('[groupEventsHandler] Role updated for current user:', {
        conversationId: payload.conversation_id,
        previousRole: payload.previous_role,
        newRole: payload.current_role,
        userId: currentUserId,
      });

      // Update role in conversation list (for future reference)
      useChatsStore.getState().updateConversationRole(
        payload.conversation_id,
        payload.current_role
      );

      // Update cache (used by ChatOptions)
      conversationDetailStore.updateMySettings(payload.conversation_id, {
        role: payload.current_role,
      });

      // Invalidate cache to force refresh next time ChatOptions opens
      conversationDetailStore.invalidateCache(payload.conversation_id);
    } else {
      // Another member's role was updated
      conversationDetailStore.updateMember(payload.conversation_id, payload.user_id, {
        role: payload.current_role,
      });
    }
    markEventProcessed(id);
  });

  // ==================== Group Invite Events ====================

  // group:invite:sent
  socket.on(WsEvents.GroupInviteSent, (payload: GroupInviteSentPayload) => {
    if (payload.invited_user_id === currentUserId) {
      // Current user received an invite - use the new store handler
      groupInviteStore.handleInviteSent({
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
          name: payload.conversation_name || '',
          avatarUrl: null,
          memberCount: 0,
        },
        inviter: {
          id: payload.inviter_id,
          fullName: payload.inviter_full_name,
          avatarUrl: null,
        },
      }, payload.invite_id); // Using invite_id as eventId for idempotency

      // TODO: Show notification to user
    }
  });

  // group:invite:accepted
  socket.on(WsEvents.GroupInviteAccepted, (payload: GroupInviteStatusPayload) => {
    // Use the new store handler
    groupInviteStore.handleInviteAccepted(
      payload.invite_id,
      payload.responded_at ? new Date(payload.responded_at).toISOString() : new Date().toISOString(),
      payload.invite_id // Using invite_id as eventId for idempotency
    );

    // NOTE: UI member list update sẽ được xử lý bởi `conversation:member:added` event
    // Backend emit cả 2 events khi invite accepted
    // TODO: If inviter, show notification that invite was accepted
  });

  // group:invite:rejected
  socket.on(WsEvents.GroupInviteRejected, (payload: GroupInviteStatusPayload) => {
    // Use the new store handler
    groupInviteStore.handleInviteRejected(
      payload.invite_id,
      payload.responded_at ? new Date(payload.responded_at).toISOString() : new Date().toISOString(),
      payload.invite_id // Using invite_id as eventId for idempotency
    );

    // TODO: If inviter, show notification that invite was rejected
  });

  // group:invite:cancelled
  socket.on(WsEvents.GroupInviteCancelled, (payload: GroupInviteStatusPayload) => {
    // Use the new store handler
    groupInviteStore.handleInviteCancelled(
      payload.invite_id,
      payload.cancelled_at ? new Date(payload.cancelled_at).toISOString() : new Date().toISOString(),
      payload.invite_id // Using invite_id as eventId for idempotency
    );

    // TODO: If invited user, show notification that invite was cancelled
  });

  // group:invite:expired
  socket.on(WsEvents.GroupInviteExpired, (payload: GroupInviteStatusPayload) => {
    // Use the new store handler
    groupInviteStore.handleInviteExpired(
      payload.invite_id,
      payload.expired_at ? new Date(payload.expired_at).toISOString() : new Date().toISOString(),
      payload.invite_id // Using invite_id as eventId for idempotency
    );

    // TODO: Remove expired item from list immediately
  });
};

export const unsubscribeFromGroupEvents = () => {
  const socket = getSocket();
  if (!socket) return;

  // Unsubscribe from all group events
  socket.off(WsEvents.ConversationCreated);
  socket.off(WsEvents.ConversationUpdated);
  socket.off(WsEvents.ConversationDisbanded);
  socket.off(WsEvents.ConversationMemberAdded);
  socket.off(WsEvents.ConversationMemberRemoved);
  socket.off(WsEvents.ConversationMemberRoleUpdated);
  socket.off(WsEvents.GroupInviteSent);
  socket.off(WsEvents.GroupInviteAccepted);
  socket.off(WsEvents.GroupInviteRejected);
  socket.off(WsEvents.GroupInviteCancelled);
  socket.off(WsEvents.GroupInviteExpired);
};

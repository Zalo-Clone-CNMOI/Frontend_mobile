/**
 * WebSocket Events - Match Backend Contracts
 * Based on @libs/contracts/src/ws/events.ts
 */

export const WsEvents = {
  // Error
  WsError: 'ws:error',

  // Presence
  PresenceHeartbeat: 'presence:heartbeat',
  PresenceUpdate: 'presence:update',

  // Chat / Typing
  ChatTyping: 'chat:typing',
  ChatTypingUpdate: 'chat:typing:update',

  // Chat / Messages
  ChatJoin: 'chat:join',
  ChatLeave: 'chat:leave',
  ChatSend: 'chat:send',
  ChatMessage: 'chat:message',
  ChatSystemMessage: 'chat:system-message',
  ChatEdit: 'chat:edit',
  ChatMessageUpdated: 'chat:message:updated',
  ChatDelete: 'chat:delete',
  ChatMessageDeleted: 'chat:message:deleted',
  ChatReact: 'chat:react',
  ChatUnreact: 'chat:unreact',
  ChatReactionAdded: 'chat:reaction:added',
  ChatReactionRemoved: 'chat:reaction:removed',
  ChatMessagePinned: 'chat:message:pinned',
  ChatMessageUnpinned: 'chat:message:unpinned',

  // Group / Conversation
  ConversationCreated: 'conversation:created',
  ConversationUpdated: 'conversation:updated',
  ConversationDisbanded: 'conversation:disbanded',
  ConversationMemberAdded: 'conversation:member:added',
  ConversationMemberRemoved: 'conversation:member:removed',
  ConversationMemberRoleUpdated: 'conversation:member:role:updated',

  // Group / Invite
  GroupInviteSent: 'group:invite:sent',
  GroupInviteAccepted: 'group:invite:accepted',
  GroupInviteRejected: 'group:invite:rejected',
  GroupInviteCancelled: 'group:invite:cancelled',
  GroupInviteExpired: 'group:invite:expired',

  // Group / Poll
  GroupPollCreated: 'group:poll:created',
  GroupPollEdited: 'group:poll:edited',
  GroupPollVoteUpdated: 'group:poll:vote:updated',
  GroupPollOptionAdded: 'group:poll:option:added',
  GroupPollOptionRemoved: 'group:poll:option:removed',
  GroupPollClosed: 'group:poll:closed',
} as const;

export type WsEventName = (typeof WsEvents)[keyof typeof WsEvents];

// ==================== Presence Types ====================

export type PresenceStatus = 'online' | 'offline';

export type PresenceSource =
  | 'connect'
  | 'disconnect'
  | 'heartbeat'
  | 'ttl_expire'
  | 'network_drop';

export type OfflineReason =
  | 'logical_disconnect'
  | 'network_drop'
  | 'ttl_expire'
  | 'cleanup';

export interface PresenceUpdatePayload {
  version?: 'v1';
  user_id: string;
  status: PresenceStatus;
  last_seen_at: number;
  expires_at: number;
  source?: PresenceSource;
  offline_reason?: OfflineReason;
  socket_count?: number;
  trace_id?: string;
}

export interface PresenceHeartbeatPayload {
  ts: number;
}

// ==================== Typing Types ====================

export interface TypingPayload {
  conversation_id: string;
  username: string;
}

export interface TypingUser {
  user_id: string;
  username: string;
}

export interface TypingUpdatePayload {
  conversation_id: string;
  users: TypingUser[];
}

// ==================== Message Pin Types ====================

export interface ChatMessagePinnedPayload {
  message_id: string;
  conversation_id: string;
  created_at: number;
  pinned_by: string;
  pinned_at: number;
}

export interface ChatMessageUnpinnedPayload {
  message_id: string;
  conversation_id: string;
  created_at: number;
  unpinned_by: string;
  unpinned_at: number;
}

// ==================== Error Types ====================

export interface WsErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

// ==================== Group / Conversation Types ====================

export interface ConversationCreatedPayload {
  conversation_id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  members: Array<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'owner' | 'admin' | 'member';
  }>;
  created_at: number;
}

export interface ConversationUpdatedPayload {
  conversation_id: string;
  updated_by: string;
  name: string | null;
  avatar_url: string | null;
  updated_at: number;
}

export interface ConversationDisbandedPayload {
  conversation_id: string;
  disbanded_by: string;
  member_ids: string[];
  disbanded_at: number;
}

export interface ConversationMemberAddedPayload {
  conversation_id: string;
  added_by: string;
  members: Array<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'owner' | 'admin' | 'member';
  }>;
  added_at: number;
}

export interface ConversationMemberRemovedPayload {
  conversation_id: string;
  removed_by: string;
  removed_user_id: string;
  removed_at: number;
}

export interface ConversationMemberRoleUpdatedPayload {
  conversation_id: string;
  updated_by: string;
  user_id: string;
  previous_role: 'owner' | 'admin' | 'member';
  current_role: 'owner' | 'admin' | 'member';
  updated_at: number;
}

// ==================== Group / Invite Types ====================

export interface GroupInviteSentPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  inviter_full_name: string;
  conversation_name: string | null;
  message: string | null;
  expires_at: number;
  sent_at: number;
}

export interface GroupInviteStatusPayload {
  invite_id: string;
  conversation_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'accepted' | 'rejected' | 'cancelled' | 'expired';
  responded_at?: number;
  cancelled_at?: number;
  expired_at?: number;
}

// ==================== Group / Poll Types ====================

export type PollStatus = 'active' | 'closed';
export type PollClosedReason = 'by_creator' | 'by_admin' | 'expired';

export interface GroupPollCreatedPayload {
  poll_id: string;
  conversation_id: string;
  message_id: string;
  creator_id: string;
  question: string;
  options: Array<{
    option_id: string;
    label: string;
    order_index: number;
  }>;
  allow_multiple: boolean;
  allow_add_option: boolean;
  expires_at: number | null;
  created_at: number;
}

export interface GroupPollEditedPayload {
  poll_id: string;
  conversation_id: string;
  editor_user_id: string;
  changes: {
    question?: string;
    allow_multiple?: boolean;
    allow_add_option?: boolean;
    expires_at?: number | null;
    edited_option_labels?: Array<{
      option_id: string;
      label: string;
    }>;
  };
  edited_at: number;
}

export interface GroupPollVoteUpdatedPayload {
  poll_id: string;
  conversation_id: string;
  tally: Array<{ option_id: string; vote_count: number }>;
  total_votes: number;
  total_voters: number;
  updated_at: number;
}

export interface GroupPollOptionAddedPayload {
  poll_id: string;
  conversation_id: string;
  option_id: string;
  label: string;
  order_index: number;
  added_by_user_id: string;
}

export interface GroupPollOptionRemovedPayload {
  poll_id: string;
  conversation_id: string;
  option_id: string;
  removed_by_user_id: string;
}

export interface GroupPollClosedPayload {
  poll_id: string;
  conversation_id: string;
  closed_by_user_id: string | null;
  reason: PollClosedReason;
  final_tally: Array<{
    option_id: string;
    vote_count: number;
  }>;
  closed_at: number;
}

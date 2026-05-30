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
  ChatMessageRejected: 'chat:message:rejected',
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
  ConversationSettingsUpdated: 'conversation:settings:updated',
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

  // Call
  CallStart: 'call:start',
  CallStarted: 'call:started',
  CallSignal: 'call:signal',
  CallSignalReceived: 'call:signal:received',
  CallAccept: 'call:accept',
  CallAccepted: 'call:accepted',
  CallReject: 'call:reject',
  CallRejected: 'call:rejected',
  CallEnd: 'call:end',
  CallEnded: 'call:ended',
  CallStateRequest: 'call:state:request',
  CallStateUpdated: 'call:state:updated',
  CallLeave: 'call:leave',
  CallLeft: 'call:left',
  CallMediaToggled: 'call:media:toggled',

  // AI / Chat
  AiSmartReplyRequest: 'ai:smart-reply:request',
  AiSmartReplyResult: 'ai:smart-reply:result',
  AiSummaryRequest: 'ai:summary:request',
  AiSummaryResult: 'ai:summary:result',
  AiTranslateRequest: 'ai:translate:request',
  AiTranslateResult: 'ai:translate:result',
  AiModerationEnforcement: 'ai:moderation:enforcement',
  AiModerationResult: 'ai:moderation:result',
MessageEntities: 'message:entities',
    AiZaiTyping: 'ai:zai:typing',
    AiStreamChunk: 'ai:stream:chunk',
    AiStreamComplete: 'ai:stream:complete',
    AiStreamCancel: 'ai:stream:cancel',
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

export interface ConversationSettingsUpdatedPayload {
  conversation_id: string;
  updated_by: string;
  settings: Record<string, unknown>;
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

// ==================== AI / Smart Reply Types ====================

export interface AiSmartReplyResultPayload {
  conversation_id: string;
  user_id: string;
  suggestions: string[];
  language: string;
  trace_id?: string;
}

// ==================== AI / Summary Types ====================

export interface AiSummaryResultPayload {
  conversation_id: string;
  summary: string;
  // Mirrors ws-gateway's emitted shape (libs/contracts WsAiSummaryResultPayload):
  // the full message_range object, NOT a flat message_count.
  message_range: {
    from_message_id: string;
    to_message_id: string;
    count: number;
  };
  cached: boolean;
  // Not part of the ws-gateway client emit; kept optional for forward-compat.
  user_id?: string;
  language?: string;
  trace_id?: string;
}

// ==================== AI / Translation Types ====================

export interface AiTranslateResultPayload {
  message_id: string;
  conversation_id: string;
  user_id: string;
  original_body: string;
  translated_body: string;
  source_language: string;
  target_language: string;
  trace_id?: string;
}

// ==================== AI / Moderation Types ====================

// Matches the ws-gateway ai-fanout enforcement emit. The offending message is
// identified by `message_id`; there is NO `removed_message_id` on the wire — the
// old phantom field silently broke handleModerationEnforcement (its guard read
// removed_message_id, which was always undefined).
export interface AiModerationEnforcementPayload {
  conversation_id: string;
  message_id: string;
  action?: string;
  outcome?: string;
  reason?: string;
  is_flagged?: boolean;
  labels?: string[];
  confidence?: number;
  enforced_at?: number;
  trace_id?: string;
}

// Sender-side flag notice. Mirrors ws-gateway WsAiModerationResultPayload
// (emitted to the sender only when is_flagged).
export interface AiModerationResultPayload {
  message_id: string;
  conversation_id: string;
  is_flagged: boolean;
  labels: string[];
  confidence: number;
  trace_id?: string;
}

// ==================== AI / Entity Types ====================

export interface MessageEntitiesPayload {
  conversation_id: string;
  message_id: string;
  user_id: string;
  entities: Array<{
    text: string;
    type: 'tool' | 'company' | 'person' | 'concept' | 'location' | 'product' | 'other';
    start_index: number;
    end_index: number;
    confidence: number;
  }>;
  trace_id?: string;
}

// ==================== Call Types ====================

export interface CallMediaToggledPayload {
  call_id: string;
  conversation_id: string;
  user_id?: string;
  audio_enabled?: boolean;
  video_enabled?: boolean;
}

export interface CallLeftPayload {
  call_id: string;
  conversation_id: string;
  user_id: string;
  reason?: string;
  left_at: number;
}

// ==================== Mention Types ====================

export interface WsMention {
  user_id: string;
  mention_type: 'user' | 'all';
  offset: number;
  length: number;
}

export interface WsChatSendPayload {
  conversation_id: string;
  message_id: string;
  body: string;
  sent_at: number;
  reply_to_message_id?: string;
  forwarded_from?: any;
  mentions?: WsMention[];
  attachments?: Array<{
    key: string;
    type: string;
    name: string;
    size: number;
    content_type: string;
    thumbnail_key?: string;
    visibility?: string;
  }>;
}

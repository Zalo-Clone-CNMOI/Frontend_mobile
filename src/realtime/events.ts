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
  ChatEdit: 'chat:edit',
  ChatMessageUpdated: 'chat:message:updated',
  ChatDelete: 'chat:delete',
  ChatMessageDeleted: 'chat:message:deleted',
  ChatReact: 'chat:react',
  ChatUnreact: 'chat:unreact',
  ChatReactionAdded: 'chat:reaction:added',
  ChatReactionRemoved: 'chat:reaction:removed',
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

// ==================== Error Types ====================

export interface WsErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

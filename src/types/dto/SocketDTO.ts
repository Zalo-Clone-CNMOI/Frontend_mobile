import type { ApiAttachmentDTO, ID, ReactionType } from "./ApiDTO";

export type SocketAckStatus = "accepted" | "rejected" | string;

export type SocketChatJoinPayload = {
  conversation_id: ID;
};

export type SocketChatTypingPayload = {
  conversation_id: ID;
  user_id?: ID;
  is_typing: boolean;
};

export type SocketChatReadPayload = {
  conversation_id: ID;
  user_id?: ID;
  read_at?: string | number;
};

export type SocketChatSendPayload = {
  conversation_id: ID;
  message_id: ID;
  body?: string;
  sent_at?: string | number;
  reply_to_message_id?: ID;
  attachments?: {
    key?: string;
    type?: string;
    name?: string;
    size?: number;
    content_type?: string;
    thumbnail_key?: string;
  }[];
};

export type SocketChatEditPayload = {
  message_id: ID;
  conversation_id: ID;
  new_body: string;
  created_at?: string | number;
};

export type SocketChatDeletePayload = {
  message_id: ID;
  conversation_id: ID;
  created_at?: string | number;
};

export type SocketChatReactPayload = {
  message_id: ID;
  conversation_id: ID;
  reaction_type: ReactionType;
};

export type SocketChatUnreactPayload = {
  message_id: ID;
  conversation_id: ID;
};

export type SocketChatAckEvent = {
  message_id?: ID;
  status?: SocketAckStatus;
  reason?: string;
  error?: string;
};

export type SocketChatMessageEvent = {
  id?: ID;
  message_id?: ID;
  conversation_id?: ID;
  sender_id?: ID;
  body?: string;
  type?: string;
  attachments?: ApiAttachmentDTO[];
  reactions?: Record<string, string[]>;
  created_at?: string | number;
  createdAt?: string | number;
  ts?: string | number;
  timestamp?: string | number;
  reply_to_message_id?: ID;
};

export type SocketChatMessageUpdatedEvent = {
  message_id?: ID;
  conversation_id?: ID;
  sender_id?: ID;
  body?: string;
  edited_at?: string | number;
};

export type SocketChatMessageDeletedEvent = {
  message_id?: ID;
  conversation_id?: ID;
  sender_id?: ID;
  deleted_at?: string | number;
};

export type SocketChatReactionAddedEvent = {
  message_id?: ID;
  conversation_id?: ID;
  user_id?: ID;
  reaction_type?: ReactionType | string;
  created_at?: string | number;
};

export type SocketChatReactionRemovedEvent = {
  message_id?: ID;
  conversation_id?: ID;
  user_id?: ID;
  reaction_type?: ReactionType | string;
  removed_at?: string | number;
};

export type SocketChatTypingUpdateEvent = {
  conversation_id: ID;
  users: {
    user_id: ID;
    username: string;
  }[];
};

export type SocketPresenceUpdateEvent = {
  user_id: ID;
  status: string;
  last_seen_at: number;
  expires_at: number;
};

export type SocketErrorEvent = {
  code: string;
  message: string;
  details?: any;
  timestamp?: number;
};

// QR Login Events
export type SocketQrBindRequestPayload = {};

export type SocketQrBindIssuedEvent = {
  socketId: string;
  socketBindingToken: string;
  expiresInSeconds: number;
};

export type SocketQrConfirmPayload = {
  socketBindingToken: string;
};

export type SocketQrRejectPayload = {
  socketBindingToken: string;
};

export type SocketQrConfirmedEvent = {
  socketBindingToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: any;
};

export type SocketQrRejectedEvent = {
  socketBindingToken: string;
  reason: string;
};

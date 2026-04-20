export type ID = string;

export type ReactionType =
  | "like"
  | "love"
  | "haha"
  | "wow"
  | "sad"
  | "angry";

export type ApiAttachmentType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "file"
  | string;

export type ApiErrorDTO = {
  message?: string;
  error?: string;
  code?: string | number;
  statusCode?: number;
};

export type ApiMetaDTO = {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type ApiResponseDTO<T> = {
  data?: T;
  message?: string;
  error?: ApiErrorDTO | string;
  meta?: ApiMetaDTO;
};

export type ApiListResponseDTO<T> = {
  data?: T[];
  items?: T[];
  messages?: T[];
  conversations?: T[];
  friends?: T[];
  meta?: ApiMetaDTO;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type ApiUserDTO = {
  id?: ID;
  _id?: ID;
  userId?: ID;
  user_id?: ID;
  fullName?: string;
  name?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  avatar?: string;
  avatarUrl?: string;
  avatar_url?: string;
  status?: string;
  lastSeen?: string | number | null;
  last_seen?: string | number | null;
};

export type ApiAttachmentDTO = {
  key?: string;
  url?: string;
  uri?: string;
  name?: string;
  size?: number | string;
  type?: ApiAttachmentType;
  contentType?: string;
  content_type?: string;
  mimeType?: string;
  mime_type?: string;
  thumbnailKey?: string;
  thumbnail_key?: string;
};

export type MessageReactionDto = {
  userId: string;
  reactionType: ReactionType;
  createdAt: number;
};

export type ReactionSummaryDto = {
  type: ReactionType;
  count: number;
  userIds: string[];
};

export type MessageReactionsResponseDto = {
  messageId: string;
  reactions: MessageReactionDto[];
  summary: ReactionSummaryDto[];
};

export type ApiMessageDTO = {
  id?: ID;
  messageId?: ID;
  message_id?: ID;
  conversationId?: ID;
  conversation_id?: ID;
  senderId?: ID;
  sender_id?: ID;
  sender?: {
    id?: ID;
    me?: boolean;
    name?: string;
  };
  body?: string;
  text?: string;
  content?: string;
  type?: ApiAttachmentType;
  attachments?: ApiAttachmentDTO[];
  attachment_key?: string;
  fileKey?: string;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id?: ID;
    senderId?: ID;
    senderName?: string;
    text?: string;
  };
  reply_to_message_id?: ID;
  status?: "sending" | "sent" | "read" | "failed" | string;
  isDeleted?: boolean;
  is_deleted?: boolean;
  isRevoked?: boolean;
  deletedFor?: string[];
  createdAt?: string | number;
  created_at?: string | number;
  timestamp?: string | number;
  sent_at?: string | number;
  forwarded_from?: {
    source_message_id: string;
    source_conversation_id: string;
    source_sender_id: string;
    source_sender_name_snapshot: string;
    source_created_at: number;
    source_type: 'text' | 'image' | 'file' | 'mixed';
  };
};

export type ApiConversationLastMessageDTO = {
  content?: string;
  body?: string;
  type?: ApiAttachmentType;
  timestamp?: string | number;
  createdAt?: string | number;
  created_at?: string | number;
  senderId?: string;
  sender_id?: string;
  senderName?: string;
  sender_name?: string;
};

export type ApiConversationDTO = {
  conversationId?: ID;
  conversation_id?: ID;
  id?: ID;
  type?: "direct" | "group" | "oa" | string;
  isGroup?: boolean;
  is_group?: boolean;
  isOwner?: boolean;
  is_owner?: boolean;
  myRole?: 'owner' | 'admin' | 'member';
  my_role?: 'owner' | 'admin' | 'member';
  name?: string;
  title?: string;
  avatar?: string;
  avatarUrl?: string;
  avatar_url?: string;
  lastMessage?: ApiConversationLastMessageDTO | null;
  last_message?: ApiConversationLastMessageDTO;
  lastMessageAt?: string | number | null;
  last_message_at?: string | number | null;
  unreadCount?: number;
  unread_count?: number;
  isMuted?: boolean;
  pinned?: boolean;
  muted?: boolean;
  memberCount?: number;
  member_count?: number;
  createdAt?: string | number;
  created_at?: string | number;
  mySettings?: {
    role?: 'owner' | 'admin' | 'member';
    nickname?: string | null;
    isMuted?: boolean;
    lastReadAt?: string | null;
  };
  my_settings?: {
    role?: 'owner' | 'admin' | 'member';
    nickname?: string | null;
    is_muted?: boolean;
    last_read_at?: string | null;
  };
};

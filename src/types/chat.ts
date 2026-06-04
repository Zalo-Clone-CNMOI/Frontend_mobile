import type { PollMessageMetadata } from './dto/PollDTO';

export type ConversationV2 = {
  conversationId: string;
  type?: 'direct' | 'group' | 'oa' | string;
  isGroup: boolean;
  isOwner?: boolean;
  myRole?: 'owner' | 'admin' | 'member';
  name?: string;
  avatar?: string | null;
  lastMessage?: {
    content: string;
    type: MessageType;
    timestamp: number;
    senderId?: string;
    senderName?: string;
  };
  lastMessageAt?: number;
  unreadCount?: number;
  initialUnreadCount?: number;
  pinned?: boolean; // Client-side computed
  isPinned?: boolean; // From API response
  pinnedAt?: number;
  isMuted?: boolean;
  muted?: boolean;
  memberCount?: number;
  createdAt?: number;
  userId?: string;
  otherUserId?: string;
  myLastReadAt?: number;
  myNickname?: string;
};

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'system' | 'poll' | 'invite';

export type SystemEventType =
  | 'member_added'
  | 'member_removed'
  | 'member_left'
  | 'role_changed'
  | 'owner_transferred'
  | 'group_disbanded'
  | 'call_ended'
  | 'call_missed';

export interface CallEndedMetadata {
  call_id: string;
  call_type: 'audio' | 'video';
  initiator_id: string;
  duration_ms: number;
  started_at: number;
  ended_at: number;
}

export interface CallMissedMetadata {
  call_id: string;
  call_type: 'audio' | 'video';
  initiator_id: string;
  reason: 'timeout' | 'rejected' | 'missed';
  started_at: number;
  ended_at: number;
}

export interface SystemMessageMetadata {
  added_by?: string;
  added_by_name?: string;
  added_members?: Array<{
    user_id: string;
    full_name: string;
  }>;
  removed_by?: string;
  removed_by_name?: string;
  removed_user_id?: string;
  removed_user_name?: string;
  user_id?: string;
  user_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  target_user_id?: string;
  target_user_name?: string;
  previous_role?: string;
  new_role?: string;
  previous_owner_id?: string;
  previous_owner_name?: string;
  new_owner_id?: string;
  new_owner_name?: string;
  disbanded_by?: string;
  disbanded_by_name?: string;
  call_id?: string;
  call_type?: 'audio' | 'video';
  initiator_id?: string;
  duration_ms?: number;
  started_at?: number;
  ended_at?: number;
  reason?: 'timeout' | 'rejected' | 'missed';
  // Nickname changed fields
  changed_by?: string;
  changed_by_name?: string;
  previous_nickname?: string;
  new_nickname?: string;
}

export interface InviteMessageMetadata {
  invite_id?: string;
  group_id?: string;
  group_name?: string;
  group_avatar_url?: string;
  inviter_id?: string;
  inviter_name?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  invited_user_id?: string;
  member_count?: number;
  message?: string;
}

export type FileInfo = {
  uri?: string;
  name?: string;
  size?: string | number;
  mimeType?: string;
};

export type Attachment = {
  key?: string;
  url?: string;
  thumbnailKey?: string;
  thumbnail_key?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  visibility?: string;
  content_type?: string;
  type?: string;
};

export type Sender = {
  id?: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  avatar?: string;
  me?: boolean;
};

export type ReplyInfo = {
  id?: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  type?: MessageType;
  thumbnailUrl?: string;
  attachmentUrl?: string;
};

export type ForwardedFrom = {
  sourceMessageId: string;
  sourceConversationId: string;
  sourceSenderId: string;
  sourceSenderNameSnapshot: string;
  source_sender_name_snapshot?: string; // Alternative field name from API
  sourceCreatedAt: number;
  sourceType: 'text' | 'image' | 'file' | 'mixed';
};

export type ChatMessage = {
  id: string;
  messageId?: string; // Alternative to id
  serverMessageId?: string;
  conversationId?: string;
  senderId?: string;
  fromMe: boolean;

  type: MessageType;
  text?: string;
  content?: string; // Alternative to text
  bodyFormat?: 'text' | 'markdown';
  fileInfo?: FileInfo;
  caption?: string;

  timestamp: number;

  replyTo?: ReplyInfo;
  forwardedFrom?: ForwardedFrom & {
    source_sender_name_snapshot?: string;
  };

  reactions?: Record<string, string[]>;

  status?: "sending" | "sent" | "read" | "failed";
  isEdited?: boolean;
  editedAt?: number;

  deletedFor?: string[];
  isRevoked?: boolean;
  revokedBackupText?: string;
  revokeRestoreUntil?: number;

  attachment?: Attachment;
  attachments?: Attachment[];
  sender?: Sender;
  senderAvatar?: string | null;
  senderName?: string;

  // Pinned message fields
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;

  // Moderation fields
  removed?: boolean;
  removalReason?: string;

  // Mention fields
  mentions?: Array<{
    user_id: string;
    mention_type: 'user' | 'all';
    offset: number;
    length: number;
  }>;

  // System message fields
  messageType?: 'user' | 'system' | 'poll' | 'invite';
  systemEventType?: SystemEventType;
  metadata?: SystemMessageMetadata | PollMessageMetadata | InviteMessageMetadata;
};

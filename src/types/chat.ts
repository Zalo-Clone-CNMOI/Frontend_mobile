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
  pinned?: boolean;
  isMuted?: boolean;
  muted?: boolean;
  memberCount?: number;
  createdAt?: number;
  userId?: string;
  otherUserId?: string;
  myLastReadAt?: number;
  myNickname?: string;
};

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'system' | 'poll';

export type SystemEventType =
  | 'member_added'
  | 'member_removed'
  | 'member_left'
  | 'role_changed'
  | 'owner_transferred'
  | 'group_disbanded'
  | 'nickname_changed';

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
  // Nickname changed fields
  changed_by?: string;
  changed_by_name?: string;
  previous_nickname?: string;
  new_nickname?: string;
}

export type FileInfo = {
  uri?: string;
  name?: string;
  size?: string | number;
  mimeType?: string;
};

export type ReplyInfo = {
  id?: string;
  senderId?: string;
  senderName?: string;
  text?: string;
};

export type ForwardedFrom = {
  sourceMessageId: string;
  sourceConversationId: string;
  sourceSenderId: string;
  sourceSenderNameSnapshot: string;
  sourceCreatedAt: number;
  sourceType: 'text' | 'image' | 'file' | 'mixed';
};

export type ChatMessage = {
  id: string;
  serverMessageId?: string;
  conversationId?: string;
  senderId?: string;
  fromMe: boolean;

  type: MessageType;
  text?: string;
  fileInfo?: FileInfo;
  caption?: string;

  timestamp: number;

  replyTo?: ReplyInfo;
  forwardedFrom?: ForwardedFrom;

  reactions?: Record<string, string[]>;

  status?: "sending" | "sent" | "read" | "failed";
  isEdited?: boolean;
  editedAt?: number;

  deletedFor?: string[];
  isRevoked?: boolean;
  revokedBackupText?: string;
  revokeRestoreUntil?: number;

  attachments?: any[];
  senderAvatar?: string | null;
  senderName?: string;

  // Pinned message fields
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;

  // System message fields
  messageType?: 'user' | 'system' | 'poll';
  systemEventType?: SystemEventType;
  metadata?: SystemMessageMetadata | PollMessageMetadata;
};

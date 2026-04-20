

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
};

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';

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
  source_message_id: string;
  source_conversation_id: string;
  source_sender_id: string;
  source_sender_name_snapshot: string;
  source_created_at: number;
  source_type: 'text' | 'image' | 'file' | 'mixed';
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
};

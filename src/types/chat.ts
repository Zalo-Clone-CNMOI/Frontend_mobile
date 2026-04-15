

export type ConversationV2 = {
  conversationId: string;
  type?: 'direct' | 'group' | 'oa' | string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    type: MessageType;
    timestamp: number;
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

export type ChatMessage = {
  id: string;
  serverMessageId?: string;
  conversationId?: string;
  senderId?: string;
  fromMe: boolean;

  type: MessageType;
  text?: string;
  fileInfo?: FileInfo;

  timestamp: number;

  replyTo?: ReplyInfo;

  reactions?: Record<string, string[]>;

  status?: "sending" | "sent" | "read" | "failed";
  isEdited?: boolean;
  editedAt?: number;

  deletedFor?: string[];
  isRevoked?: boolean;
  revokedBackupText?: string;
  revokeRestoreUntil?: number;

  attachments?: any[];
};

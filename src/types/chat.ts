
// Conversation shape used by Zalo v2 (production-like)

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
};

// Rich chat message used across components and mock v2 data
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
  // keeps old `fromMe` boolean used in UI
  fromMe: boolean;

  type: MessageType;
  // textual content (for text messages)
  text?: string;
  // file metadata for images/files
  fileInfo?: FileInfo;

  // timestamp in ms since epoch (components call `new Date(...)` on this)
  timestamp: number;

  // reply information shown inline in message bubble
  replyTo?: ReplyInfo;

  // reactions mapping emoji -> userIds
  reactions?: Record<string, string[]>;

  // optimistic sending state
  status?: "sending" | "sent" | "read" | "failed";
  isEdited?: boolean;
  editedAt?: number;

  // per-user deletion and revoke flags
  deletedFor?: string[];
  isRevoked?: boolean;
  revokedBackupText?: string;
  revokeRestoreUntil?: number;
};

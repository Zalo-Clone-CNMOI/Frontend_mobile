import type { ID } from '../dto/ApiDTO';

export type AttachmentType = 'image' | 'document' | 'audio' | 'video' | 'file';
export type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'angry';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';

export enum SystemEventType {
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_LEFT = 'member_left',
  ROLE_CHANGED = 'role_changed',
  OWNER_TRANSFERRED = 'owner_transferred',
  GROUP_DISBANDED = 'group_disbanded',
  MESSAGE_PINNED = 'message_pinned',
  MESSAGE_UNPINNED = 'message_unpinned',
  NICKNAME_CHANGED = 'nickname_changed',
  CALL_ENDED = 'call_ended',
  CALL_MISSED = 'call_missed',
}

export interface MessagePinnedMetadata {
  pinnedBy: string;
  pinnedByName: string;
  messageId: string;
  previewText?: string;
}

export interface MessageUnpinnedMetadata {
  unpinnedBy: string;
  unpinnedByName: string;
  messageId?: string;
  previewText?: string;
}

export interface MemberAddedMetadata {
  addedBy: string;
  addedByName: string;
  addedMembers: Array<{
    userId: string;
    fullName: string;
  }>;
}

export interface MemberRemovedMetadata {
  removedBy: string;
  removedByName: string;
  removedUserId: string;
  removedUserName: string;
}

export interface MemberLeftMetadata {
  userId: string;
  userName: string;
}

export interface RoleChangedMetadata {
  updatedBy: string;
  updatedByName: string;
  targetUserId: string;
  targetUserName: string;
  previousRole: string;
  newRole: string;
}

export interface OwnerTransferredMetadata {
  previousOwnerId: string;
  previousOwnerName: string;
  newOwnerId: string;
  newOwnerName: string;
}

export interface GroupDisbandedMetadata {
  disbandedBy: string;
  disbandedByName: string;
}

export interface NicknameChangedMetadata {
  changedBy: string;
  changedByName: string;
  previousNickname: string;
  newNickname: string;
}

export interface CallEndedMetadata {
  callId: string;
  callType: 'audio' | 'video';
  initiatorId: string;
  durationMs: number;
  startedAt: number;
  endedAt: number;
}

export interface CallMissedMetadata {
  callId: string;
  callType: 'audio' | 'video';
  initiatorId: string;
  reason: 'timeout' | 'rejected' | 'missed';
  startedAt: number;
  endedAt: number;
}

export type SystemMessageMetadata =
  | MemberAddedMetadata
  | MemberRemovedMetadata
  | MemberLeftMetadata
  | RoleChangedMetadata
  | OwnerTransferredMetadata
  | GroupDisbandedMetadata
  | MessagePinnedMetadata
  | MessageUnpinnedMetadata
  | NicknameChangedMetadata
  | CallEndedMetadata
  | CallMissedMetadata;

export interface ConversationLastMessage {
  id: string;
  content: string;
  createdAt: string | number | null;
  senderId: string;
  senderName: string;
  type?: MessageType;
}

export interface ConversationMember {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  nickname: string | null;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'oa';
  name: string | null;
  avatarUrl: string | null;
  createdById: string;
  lastMessage?: ConversationLastMessage | null;
  members?: ConversationMember[];
  memberCount: number;
  isPinned?: boolean;
  pinnedAt?: number | null;
  unreadCount?: number;
  mySettings?: {
    role: 'owner' | 'admin' | 'member';
    nickname: string | null;
    isMuted: boolean;
    isPinned: boolean;
    pinnedAt: string | null;
    lastReadAt: string | null;
  };
  createdAt: string;
  isGroup: boolean;
  isOwner?: boolean;
  myRole?: 'owner' | 'admin' | 'member';
  isMuted?: boolean;
  muted?: boolean;
  myLastReadAt?: number;
  myNickname?: string;
}

export interface ConversationListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ConversationListResponse {
  success: boolean;
  data: Conversation[];
  meta: ConversationListMeta;
  timestamp?: string;
}

export interface Attachment {
  key: string;
  type: AttachmentType;
  name: string;
  size: number;
  contentType: string;
  thumbnailKey?: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface ReplyPreview {
  messageId: string;
  senderId: string;
  body: string;
  attachments?: Attachment[];
  isDeleted?: boolean;
}

export interface ForwardedFrom {
  sourceMessageId: string;
  sourceConversationId: string;
  sourceSenderId: string;
  sourceSenderNameSnapshot: string;
  sourceCreatedAt: number;
  sourceType: 'text' | 'image' | 'file' | 'mixed';
}

export interface UiMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: number;
  attachments: Attachment[];
  type?: 'text' | 'system';
  messageType?: 'user' | 'system';
  systemAction?: SystemEventType;
  systemEventType?: SystemEventType;
  metadata?: SystemMessageMetadata;
  replyTo?: ReplyPreview | null;
  replyToMessageId?: string | null;
  editedAt?: number | null;
  deletedAt?: number | null;
  isDeleted?: boolean;
  pending?: boolean;
  failed?: boolean;
  fromMe?: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  reactions?: Record<string, string[]>;
  status?: 'sending' | 'sent' | 'read' | 'failed';
  isRevoked?: boolean;
  revokedBackupText?: string;
  revokeRestoreUntil?: number;
  forwardedFrom?: ForwardedFrom;
  fileInfo?: {
    uri: string;
    name: string;
    size: number;
    mimeType: string;
  };
  caption?: string;
  timestamp?: number;
  isEdited?: boolean;
  deletedFor?: string[];
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;
}

export interface MessagePage {
  items: UiMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationState {
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

export interface PinnedMessageItem {
  message: UiMessage;
  pinnedBy: string;
  pinnedAt: number;
}

export interface ChatState {
  initialized: boolean;
  socketConnected: boolean;
  activeConversationId: string | null;
  currentUserId: string | null;
  error: string | null;

  messagesByConversation: Record<string, UiMessage[]>;
  paginationByConversation: Record<string, PaginationState>;

  listConversation: Conversation[];
  conversationMeta: ConversationListMeta | null;
  conversationLoading: boolean;
  conversationFetched: boolean;
  conversationDetailById: Record<string, Conversation>;
  conversationDetailLoadingById: Record<string, boolean>;

  heartbeatId: ReturnType<typeof setInterval> | null;
  mediaByConversation: Record<string, Attachment[]>;
  filesByConversation: Record<string, Attachment[]>;
  linksByConversation: Record<string, string[]>;

  typingUsersByConversation: Record<string, { userId: string; username: string }[]>;
  presence: Record<string, { status: 'online' | 'offline'; lastSeenAt: number; expiresAt: number }>;
}

export interface ChatSetters {
  setInitialized: (value: boolean) => void;
  setSocketConnected: (value: boolean) => void;
  setActiveConversationId: (value: string | null) => void;
  setCurrentUserId: (value: string | null) => void;
  setError: (value: string | null) => void;

  setListConversation: (items: Conversation[]) => void;
  setConversationMeta: (meta: ConversationListMeta | null) => void;
  setConversationLoading: (value: boolean) => void;
  setConversationFetched: (value: boolean) => void;
  setConversationDetail: (conversationId: string, conversation: Conversation) => void;
  fetchConversationDetail: (conversationId: string, force?: boolean) => Promise<void>;

  setMessages: (conversationId: string, messages: UiMessage[]) => void;
  appendMessages: (conversationId: string, messages: UiMessage[], moveToTop?: boolean) => void;
  prependMessages: (conversationId: string, messages: UiMessage[]) => void;
  appendRealtimeMessage: (conversationId: string, message: UiMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<UiMessage>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  revokeMessage: (conversationId: string, messageId: string) => void;

  setPagination: (conversationId: string, value: Partial<PaginationState>) => void;

  setMediaByConversation: (conversationId: string, items: Attachment[]) => void;
  setFilesByConversation: (conversationId: string, items: Attachment[]) => void;
  setLinksByConversation: (conversationId: string, items: string[]) => void;

  upsertConversationToTop: (conversation: Conversation) => void;
  removeConversationLocally: (conversationId: string) => void;
  resetChatState: () => void;
  updateTypingUsers: (conversationId: string, users: { userId: string; username: string }[]) => void;
  updateConversationPinStatus: (conversationId: string, isPinned: boolean) => void;
  updatePresence: (userId: string, status: 'online' | 'offline', lastSeenAt: number, expiresAt: number) => void;
  resetUnreadCount: (conversationId: string) => void;

  // Pinned messages
  setPinnedMessages: (conversationId: string, items: PinnedMessageItem[]) => void;
  addPinnedMessage: (conversationId: string, item: PinnedMessageItem) => void;
  removePinnedMessage: (conversationId: string, messageId: string) => void;

  // Reactions
  addReaction: (conversationId: string, messageId: string, userId: string, reactionType: string) => void;
  removeReaction: (conversationId: string, messageId: string, userId: string) => void;
  setMessageReactions: (conversationId: string, messageId: string, reactions: Record<string, string[]>) => void;
}

export type ChatStore = ChatState & ChatSetters;

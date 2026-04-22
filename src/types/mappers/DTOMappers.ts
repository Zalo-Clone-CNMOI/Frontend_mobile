import type { ChatMessage, ConversationV2, MessageType } from "../chat";
import type { ContactUser } from "../ContactUser";
import type {
  ApiAttachmentDTO,
  ApiConversationDTO,
  ApiListResponseDTO,
  ApiMessageDTO,
  ApiUserDTO,
  ID,
} from "../dto/ApiDTO";
import type { SocketChatMessageEvent } from "../dto/SocketDTO";
import { NETWORK_CONFIG } from '../../config/network';

const S3_BASE_URL = NETWORK_CONFIG.S3_BASE_URL + '/';

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    // Replace bucket name if URL from backend uses wrong bucket
    return avatar.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
  }
  return S3_BASE_URL + avatar.replace(/^\//, '');
};

const toStringId = (...values: unknown[]): string => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text.length > 0) return text;
  }
  return "";
};

const toNumberTimestamp = (...values: unknown[]): number => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const num = Number(value);
    if (!Number.isNaN(num) && Number.isFinite(num) && num > 0) return num;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return Date.now();
};

const toOptionalTimestamp = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const num = Number(value);
    if (!Number.isNaN(num) && Number.isFinite(num) && num > 0) return num;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

const toPresenceStatus = (value: unknown): ContactUser["status"] => {
  const normalized = String(value || "offline").toLowerCase();
  if (normalized === "online" || normalized === "away") {
    return normalized;
  }
  return "offline";
};

const mapAttachmentTypeToMessageType = (
  attachment?: ApiAttachmentDTO,
  fallbackType?: string,
): MessageType => {
  const rawType = String(attachment?.type || fallbackType || "text").toLowerCase();
  if (rawType === "document") return "file";
  if (
    rawType === "text" ||
    rawType === "image" ||
    rawType === "video" ||
    rawType === "file" ||
    rawType === "voice" ||
    rawType === "system"
  ) {
    return rawType;
  }
  return "text";
};

export const mapApiMessageToChatMessage = (
  dto: ApiMessageDTO,
  currentUserId?: ID,
): ChatMessage => {
  const firstAttachment = Array.isArray(dto.attachments) ? dto.attachments[0] : undefined;
  const senderId = toStringId(dto.senderId, dto.sender_id, dto.sender?.id);
  const body = dto.body ?? dto.text ?? dto.content ?? "";

  const fromMe =
    dto.sender?.me === true ||
    senderId === "user-me" ||
    (Boolean(currentUserId) && senderId === String(currentUserId));

  return {
    id: toStringId(dto.id, dto.messageId, dto.message_id),
    conversationId: toStringId(dto.conversationId, dto.conversation_id) || undefined,
    senderId: senderId || undefined,
    fromMe,
    type: mapAttachmentTypeToMessageType(firstAttachment, dto.type),
    text: body,
    timestamp: toNumberTimestamp(dto.createdAt, dto.created_at, dto.timestamp, dto.sent_at),
    fileInfo: firstAttachment
      ? {
          uri: firstAttachment.url || firstAttachment.uri || "",
          name: firstAttachment.name || "File",
          size: firstAttachment.size || 0,
          mimeType:
            firstAttachment.contentType ||
            firstAttachment.content_type ||
            firstAttachment.mimeType ||
            firstAttachment.mime_type ||
            "",
        }
      : undefined,
    replyTo:
      dto.replyTo ||
      (dto.reply_to_message_id ? { id: String(dto.reply_to_message_id) } : undefined),
    forwardedFrom: dto.forwarded_from
      ? {
          source_message_id: dto.forwarded_from.source_message_id,
          source_conversation_id: dto.forwarded_from.source_conversation_id,
          source_sender_id: dto.forwarded_from.source_sender_id,
          source_sender_name_snapshot: dto.forwarded_from.source_sender_name_snapshot,
          source_created_at: dto.forwarded_from.source_created_at,
          source_type: dto.forwarded_from.source_type,
        }
      : undefined,
    reactions: dto.reactions,
    status:
      dto.status === "sending" ||
      dto.status === "sent" ||
      dto.status === "read" ||
      dto.status === "failed"
        ? dto.status
        : undefined,
    deletedFor: dto.deletedFor,
    isRevoked: Boolean(dto.isDeleted || dto.is_deleted || dto.isRevoked),
  };
};

export const mapSocketMessageEventToChatMessage = (
  event: SocketChatMessageEvent,
  currentUserId?: ID,
): ChatMessage => {
  return mapApiMessageToChatMessage(
    {
      id: event.id,
      message_id: event.message_id,
      conversation_id: event.conversation_id,
      sender_id: event.sender_id,
      body: event.body,
      type: event.type,
      attachments: event.attachments,
      reactions: event.reactions,
      created_at: event.created_at,
      createdAt: event.createdAt,
      timestamp: event.timestamp ?? event.ts,
      forwarded_from: event.forwarded_from,
    },
    currentUserId,
  );
};


export const mapApiConversationToConversationV2 = (
  dto: ApiConversationDTO,
): ConversationV2 => {
  const lastMessage = dto.lastMessage || dto.last_message;
  const lastMessageTimestamp = toNumberTimestamp(
    lastMessage?.timestamp,
    lastMessage?.createdAt,
    lastMessage?.created_at,
  );
  const lastMessageAt = toOptionalTimestamp(
    dto.lastMessageAt,
    dto.last_message_at,
    lastMessage?.timestamp,
    lastMessage?.createdAt,
    lastMessage?.created_at,
  );
  const type = dto.type;
  const isGroup =
    typeof dto.isGroup === "boolean"
      ? dto.isGroup
      : typeof dto.is_group === "boolean"
        ? dto.is_group
        : type === "group";
  const isOwner = dto.isOwner ?? dto.is_owner ?? (dto.myRole === 'owner' || dto.my_role === 'owner');
  const myRole = dto.myRole ?? dto.my_role;
  const muted = Boolean(dto.isMuted ?? dto.muted);
  const myLastReadAt = dto.mySettings?.lastReadAt
    ? new Date(dto.mySettings.lastReadAt).getTime()
    : dto.my_settings?.last_read_at
      ? new Date(dto.my_settings.last_read_at).getTime()
      : undefined;

  return {
    conversationId: toStringId(dto.conversationId, dto.conversation_id, dto.id),
    type,
    isGroup,
    name: dto.name || dto.title,
    avatar: normalizeAvatarUrl(dto.avatar || dto.avatarUrl || dto.avatar_url),
    lastMessage: lastMessage
      ? {
          content: String(lastMessage.content || lastMessage.body || ""),
          type: mapAttachmentTypeToMessageType(undefined, lastMessage.type),
          timestamp: lastMessageTimestamp,
          senderId: (lastMessage as any).senderId || (lastMessage as any).sender_id,
          senderName: (lastMessage as any).senderName || (lastMessage as any).sender_name,
        }
      : undefined,
    lastMessageAt,
    unreadCount: Number(dto.unreadCount ?? dto.unread_count ?? 0),
    pinned: Boolean(dto.pinned),
    isMuted: muted,
    muted,
    memberCount:
      dto.memberCount !== undefined || dto.member_count !== undefined
        ? Number(dto.memberCount ?? dto.member_count ?? 0)
        : undefined,
    isOwner,
    myRole,
    myLastReadAt,
    createdAt: toOptionalTimestamp(dto.createdAt, dto.created_at),
  };
};

export const mapApiUserToContactUser = (dto: ApiUserDTO): ContactUser => {
  const id = toStringId(dto.id, dto._id, dto.userId, dto.user_id);
  const firstName = dto.firstName || dto.first_name || "";
  const lastName = dto.lastName || dto.last_name || "";
  const fullName = dto.fullName || dto.name || `${firstName} ${lastName}`.trim() || "Unknown";

  return {
    id,
    fullName,
    avatar: normalizeAvatarUrl(dto.avatar || dto.avatarUrl || dto.avatar_url),
    status: toPresenceStatus(dto.status),
    lastSeen: toOptionalTimestamp(dto.lastSeen, dto.last_seen) ?? null,
  };
};

export const mapMessagesListFromApi = (
  payload?: ApiListResponseDTO<ApiMessageDTO> | ApiMessageDTO[] | null,
  currentUserId?: ID,
): ChatMessage[] => {
  if (!payload) return [];
  const raw = Array.isArray(payload)
    ? payload
    : payload.items || payload.messages || payload.data || [];
  return raw.map((item) => mapApiMessageToChatMessage(item, currentUserId));
};

export const mapConversationsListFromApi = (
  payload?: ApiListResponseDTO<ApiConversationDTO> | ApiConversationDTO[] | null,
): ConversationV2[] => {
  if (!payload) return [];
  const raw = Array.isArray(payload)
    ? payload
    : payload.conversations || payload.items || payload.data || [];
  return raw.map(mapApiConversationToConversationV2);
};

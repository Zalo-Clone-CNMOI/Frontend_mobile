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
import type { ChatMessage, ConversationV2, MessageType } from "../chat";

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
  const muted = Boolean(dto.isMuted ?? dto.muted);

  return {
    conversationId: toStringId(dto.conversationId, dto.conversation_id, dto.id),
    type,
    isGroup,
    name: dto.name || dto.title,
    avatar: dto.avatar || dto.avatarUrl || dto.avatar_url,
    lastMessage: lastMessage
      ? {
          content: String(lastMessage.content || lastMessage.body || ""),
          type: mapAttachmentTypeToMessageType(undefined, lastMessage.type),
          timestamp: lastMessageTimestamp,
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
    avatar:
      dto.avatar ||
      dto.avatarUrl ||
      dto.avatar_url ||
      `https://i.pravatar.cc/150?u=${id || "default"}`,
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

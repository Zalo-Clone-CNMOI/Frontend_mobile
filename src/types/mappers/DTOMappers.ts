import type { ChatMessage, ConversationV2, MessageType } from "../chat";

import type { ContactUser } from "../contacts";

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

  const senderId = toStringId(dto.senderId, dto.sender?.id);

  const body = dto.body ?? dto.text ?? dto.content ?? "";



  const fromMe =

    dto.sender?.me === true ||

    senderId === "user-me" ||

    (Boolean(currentUserId) && senderId === String(currentUserId));



  return {

    id: toStringId(dto.id, dto.messageId),

    conversationId: toStringId(dto.conversationId) || undefined,

    senderId: senderId || undefined,

    fromMe,

    type: mapAttachmentTypeToMessageType(firstAttachment, dto.type),

    text: body,

    timestamp: toNumberTimestamp(dto.createdAt, dto.timestamp, dto.sentAt),

    fileInfo: firstAttachment

      ? {

          uri: firstAttachment.url || firstAttachment.uri || "",

          name: firstAttachment.name || "File",

          size: firstAttachment.size || 0,

          mimeType:

            firstAttachment.contentType ||

            firstAttachment.mimeType ||

            "",

        }

      : undefined,

    replyTo:

      dto.replyTo ||

      (dto.replyToMessageId ? { id: String(dto.replyToMessageId) } : undefined),

    forwardedFrom: dto.forwardedFrom

      ? {

          sourceMessageId: dto.forwardedFrom.sourceMessageId,

          sourceConversationId: dto.forwardedFrom.sourceConversationId,

          sourceSenderId: dto.forwardedFrom.sourceSenderId,

          sourceSenderNameSnapshot: dto.forwardedFrom.sourceSenderNameSnapshot,

          sourceCreatedAt: dto.forwardedFrom.sourceCreatedAt,

          sourceType: dto.forwardedFrom.sourceType,

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

    isRevoked: Boolean(dto.isDeleted || dto.isRevoked),

    senderName: dto.sender?.name,

  };

};



export const mapSocketMessageEventToChatMessage = (

  event: SocketChatMessageEvent,

  currentUserId?: ID,

): ChatMessage => {

  return mapApiMessageToChatMessage(

    {

      id: event.id,

      messageId: event.message_id,

      conversationId: event.conversation_id,

      senderId: event.sender_id,

      body: event.body,

      type: event.type,

      attachments: event.attachments,

      reactions: event.reactions,

      createdAt: event.created_at ?? event.createdAt ?? event.timestamp ?? event.ts,

      forwardedFrom: event.forwarded_from

        ? {

            sourceMessageId: event.forwarded_from.source_message_id,

            sourceConversationId: event.forwarded_from.source_conversation_id,

            sourceSenderId: event.forwarded_from.source_sender_id,

            sourceSenderNameSnapshot: event.forwarded_from.source_sender_name_snapshot,

            sourceCreatedAt: event.forwarded_from.source_created_at,

            sourceType: event.forwarded_from.source_type,

          }

        : undefined,

    },

    currentUserId,

  );

};





export const mapApiConversationToConversationV2 = (

  dto: ApiConversationDTO,

): ConversationV2 => {

  const lastMessage = dto.lastMessage;

  const lastMessageTimestamp = toNumberTimestamp(

    lastMessage?.timestamp,

    lastMessage?.createdAt,

  );

  const lastMessageAt = toOptionalTimestamp(

    dto.lastMessageAt,

    lastMessage?.timestamp,

    lastMessage?.createdAt,

  );

  const type = dto.type;

  const isGroup =

    typeof dto.isGroup === "boolean"

      ? dto.isGroup

      : type === "group";

  const isOwner = dto.isOwner ?? (dto.myRole === 'owner');

  const myRole = dto.myRole;

  const muted = Boolean(dto.isMuted ?? dto.muted);

  const myLastReadAt = dto.mySettings?.lastReadAt

    ? new Date(dto.mySettings.lastReadAt).getTime()

    : undefined;

  const myNickname = dto.mySettings?.nickname || undefined;



  return {

    conversationId: toStringId(dto.conversationId, dto.id),

    type,

    isGroup,

    name: dto.name || dto.title,

    avatar: normalizeAvatarUrl(dto.avatar || dto.avatarUrl),

    lastMessage: lastMessage

      ? {

          content: String(lastMessage.content || lastMessage.body || ""),

          type: mapAttachmentTypeToMessageType(undefined, lastMessage.type),

          timestamp: lastMessageTimestamp,

          senderId: lastMessage.senderId,

          senderName: lastMessage.senderName,

        }

      : undefined,

    lastMessageAt,

    unreadCount: Number(dto.unreadCount ?? 0),

    pinned: Boolean(dto.isPinned || dto.pinned),  // Backend returns isPinned

    pinnedAt: toOptionalTimestamp(dto.pinnedAt),  // Backend returns pinnedAt timestamp

    isMuted: muted,

    muted,

    memberCount: dto.memberCount !== undefined ? Number(dto.memberCount) : undefined,

    isOwner,

    myRole,

    myLastReadAt,

    myNickname,

    createdAt: toOptionalTimestamp(dto.createdAt),

  };

};



export const mapApiUserToContactUser = (dto: ApiUserDTO): ContactUser => {

  const id = toStringId(dto.id, dto.userId);

  const firstName = dto.firstName || "";

  const lastName = dto.lastName || "";

  const fullName = dto.fullName || dto.name || `${firstName} ${lastName}`.trim() || "Unknown";



  return {

    id,

    fullName,

    avatar: normalizeAvatarUrl(dto.avatar || dto.avatarUrl),

    status: toPresenceStatus(dto.status),

    lastSeen: toOptionalTimestamp(dto.lastSeen) ?? null,

  };

};



export type PinnedMessageItemDTO = {

  message: ApiMessageDTO;

  pinnedBy: string;

  pinnedAt: number;

};



export type PinnedMessageItem = {

  message: ChatMessage;

  pinnedBy: string;

  pinnedAt: number;

};



export const mapApiPinnedMessageToChatMessageItem = (

  dto: PinnedMessageItemDTO,

  currentUserId?: ID,

): PinnedMessageItem => {

  return {

    message: mapApiMessageToChatMessage(dto.message, currentUserId),

    pinnedBy: dto.pinnedBy,

    pinnedAt: dto.pinnedAt,

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



export const mapPinnedMessagesListFromApi = (

  payload?: ApiListResponseDTO<PinnedMessageItemDTO> | PinnedMessageItemDTO[] | null,

  currentUserId?: ID,

): PinnedMessageItem[] => {

  if (!payload) return [];

  const raw = Array.isArray(payload)

    ? payload

    : payload.items || payload.data || [];

  return raw.map((item) => mapApiPinnedMessageToChatMessageItem(item, currentUserId));

};


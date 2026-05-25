import type { ChatMessage } from "../types/chat";
import { getCurrentUser } from "./authService";


// Cache of current user's IDs
const currentActorIds = new Set<string>(["user-me"]);
let actorIdsHydrated = false;

/**
 * Hydrate current actor IDs from user data
 */
export async function hydrateCurrentActorIds(): Promise<void> {
  if (actorIdsHydrated) return;

  try {
    const user = await getCurrentUser();
    const ids = [
      user?.id,
      user?.phone,
      (user as any)?.userId,
      (user as any)?._id,
      (user as any)?.uid,
      (user as any)?.sub,
    ];
    ids
      .map(normalizeId)
      .filter(Boolean)
      .forEach((id) => currentActorIds.add(id));
  } catch (e) {
    // Silent fail
  } finally {
    actorIdsHydrated = true;
  }
}

/**
 * Check if sender is current user
 */
export function isCurrentActor(senderId: unknown): boolean {
  const normalized = normalizeId(senderId);
  return normalized.length > 0 && currentActorIds.has(normalized);
}

/**
 * Normalize ID to string
 */
export function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Convert timestamp to milliseconds
 */
export function toTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Build stable message ID
 */
export function buildStableMessageId(apiMessage: any): string {
  const directId = normalizeId(apiMessage?.messageId);
  if (directId) return directId;

  const conversationId = normalizeId(apiMessage?.conversationId);
  const senderId = normalizeId(apiMessage?.senderId);
  const createdAt = normalizeId(apiMessage?.createdAt);
  const body = normalizeId(apiMessage?.body);
  const attachmentKey = normalizeId(
    Array.isArray(apiMessage?.attachments) ? apiMessage?.attachments?.[0]?.key : ""
  );

  const composite = [conversationId, senderId, createdAt, body, attachmentKey]
    .filter(Boolean)
    .join("|");

  if (composite) return `msg_${composite}`;
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Convert backend message to ChatMessage format
 */
export function toLegacyChatMessage(apiMessage: any): ChatMessage {
  const firstAttachment = Array.isArray(apiMessage?.attachments)
    ? apiMessage.attachments[0]
    : undefined;

  // For system messages, sender info might be in metadata
  const metadataSenderId = apiMessage?.metadata?.added_by || apiMessage?.metadata?.removed_by;
  const senderId = apiMessage?.senderId || apiMessage?.sender_id || metadataSenderId;
  const body = apiMessage?.body ?? "";
  const createdAtRaw =
    apiMessage?.createdAt ?? apiMessage?.created_at ?? apiMessage?.ts ?? apiMessage?.timestamp ?? Date.now();
  const editedAtRaw = apiMessage?.editedAt ?? apiMessage?.edited_at ?? null;
  const attachmentType = firstAttachment?.type;
  const serverMessageId = normalizeId(
    apiMessage?.messageId || apiMessage?.message_id || apiMessage?.id
  );
  const messageType =
    attachmentType === "document"
      ? "file"
      : attachmentType === "audio"
      ? "voice"
      : attachmentType || "text";

  const result = {
    id: buildStableMessageId(apiMessage),
    serverMessageId: serverMessageId || undefined,
    conversationId: apiMessage?.conversationId || apiMessage?.conversation_id,
    fromMe: isCurrentActor(senderId),
    senderId: senderId,
    senderName: apiMessage?.senderName || apiMessage?.sender?.name || apiMessage?.sender?.fullName,
    senderAvatar:
      apiMessage?.senderAvatar || apiMessage?.sender?.avatarUrl || apiMessage?.sender?.avatar,
    type: (apiMessage?.messageType === "system" || apiMessage?.message_type === "system" || apiMessage?.type === "system") ? "system" :
          (apiMessage?.messageType === "poll" || apiMessage?.message_type === "poll" || apiMessage?.type === "poll") ? "poll" :
          (apiMessage?.messageType === "invite" || apiMessage?.message_type === "invite" || apiMessage?.type === "invite") ? "invite" : messageType,
    // Log for debugging
    // debug: { msgType: apiMessage?.messageType, msg_type: apiMessage?.message_type, rawType: apiMessage?.type },
    text: body,
    timestamp: toTimestampMs(createdAtRaw),
    fileInfo: firstAttachment
      ? {
          uri: firstAttachment.key || firstAttachment.url || "",
          name: firstAttachment.name || "File",
          size: firstAttachment.size || 0,
          mimeType: firstAttachment.contentType || firstAttachment.type || "",
        }
      : undefined,
    replyTo: apiMessage?.replyToMessageId || apiMessage?.reply_to_message_id
      ? { id: apiMessage.replyToMessageId || apiMessage.reply_to_message_id }
      : undefined,
    forwardedFrom: apiMessage?.forwarded_from || apiMessage?.forwardedFrom,
    reactions: apiMessage?.reactions,
    status: apiMessage?.status,
    isEdited: Boolean(editedAtRaw),
    editedAt: editedAtRaw ? toTimestampMs(editedAtRaw) : undefined,
    isRevoked: Boolean(apiMessage?.isDeleted),
    attachments: Array.isArray(apiMessage?.attachments) ? apiMessage.attachments : undefined,
    mentions: apiMessage?.mentions,
    messageType: apiMessage?.messageType ?? apiMessage?.message_type,
    systemEventType: apiMessage?.systemEventType || apiMessage?.system_event_type,
    metadata: apiMessage?.metadata,
  };
  
  // Log system message detection
  if (result.type === 'system' || result.messageType === 'system') {
    console.log('[toLegacyChatMessage] System message detected:', { id: result.id, type: result.type, messageType: result.messageType, senderId: result.senderId });
  }
  
  return result;
}

/**
 * Enrich reply message details
 */
export async function enrichReplyToDetails(message: ChatMessage): Promise<ChatMessage> {
  if (!message.replyTo?.id || message.replyTo.text) {
    return message;
  }

  try {
    const messagesApi = await import("./messagesApi");
    const replyMessageDetails = await messagesApi.getMessageDetails(
      message.conversationId || "",
      message.timestamp,
      message.replyTo.id
    );
    if (replyMessageDetails?.data) {
      const replyMsg = replyMessageDetails.data;
      return {
        ...message,
        replyTo: {
          id: message.replyTo.id,
          senderId: replyMsg.senderId,
          senderName: replyMsg.senderName || replyMsg.sender?.name || "User",
          text: replyMsg.body || replyMsg.text || "",
        },
      };
    }
    return message;
  } catch (error) {
    return message;
  }
}

/**
 * Get reply preview text
 */
export const getReplyPreview = (replyTo?: { text?: string }, attachments?: any[]) => {
  if (!replyTo) {
    return {
      text: "",
      imageAttachment: null,
      videoAttachment: null,
    };
  }

  const imageAttachment = attachments?.find((att: any) => att.type === "image") ?? null;
  const videoAttachment = attachments?.find((att: any) => att.type === "video") ?? null;
  const text = (replyTo.text ?? "").replace(/\u200B/g, "").trim();

  if (text) {
    return { text, imageAttachment, videoAttachment };
  }

  if (imageAttachment) {
    return { text: "Ảnh", imageAttachment, videoAttachment: null };
  }

  if (videoAttachment) {
    return { text: "Video", imageAttachment: null, videoAttachment };
  }

  return {
    text: attachments?.length ? "Tệp đính kèm" : "Tin nhắn",
    imageAttachment: null,
    videoAttachment: null,
  };
};

/**
 * Update conversation list with last message preview
 */
export async function updateConversationLastMessage(
  enrichedMessage: any,
  payload: any
): Promise<void> {
  const { detectPreviewTypeFromMessage, formatPreviewContent } = await import(
    "../utils/messagePreviewFormatter"
  );
  const { useChatsStore } = await import("../store/useChatsStore");

  const conversationId =
    payload?.conversation_id ||
    payload?.conversationId ||
    enrichedMessage?.conversationId;
  const createdAt =
    typeof payload?.created_at === "number"
      ? payload?.created_at
      : typeof payload?.createdAt === "number"
      ? payload?.createdAt
      : typeof payload?.ts === "number"
      ? payload?.ts
      : typeof enrichedMessage?.timestamp === "number"
      ? enrichedMessage?.timestamp
      : Date.now();

  if (!conversationId) return;

  const previewContent = formatPreviewContent(enrichedMessage);
  const previewType = detectPreviewTypeFromMessage(enrichedMessage);

  const isFromMe =
    enrichedMessage?.fromMe === true || enrichedMessage?.sender?.me === true;

  useChatsStore.getState().updateLastMessage(
    conversationId,
    previewContent,
    previewType,
    createdAt,
    payload?.sender_id || payload?.senderId || enrichedMessage?.senderId,
    payload?.sender_name || payload?.senderName || enrichedMessage?.senderName,
    !isFromMe
  );
}

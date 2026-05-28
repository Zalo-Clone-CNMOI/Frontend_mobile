import { Socket } from "socket.io-client";
import type { UserV2 } from "../types/contacts";
import type { ChatMessage } from "../types/chat";
import type { SocketChatJoinPayload, SocketChatMessageRejectedEvent } from "../types/dto/SocketDTO";
import type { MessageReactionsResponseDto } from "../types/dto/ApiDTO";
import { mapConversationsListFromApi } from "../types/mappers/DTOMappers";
import type { MediaFileInput } from "../types/media";

import { getCurrentUser } from "./authService";
import * as conversationsApi from "./conversationsApi";
import * as friendsApi from "./friendsApi";
import { buildAttachmentDto, uploadMedia } from "./mediaService";
import * as messagesApi from "./messagesApi";
import { connectSocket, getSocket } from "./socket";
import { getDeduplicationService } from "./deduplicationService";
import { WsEvents } from "../realtime/events";
import { toast } from "./toastService";

// Normalize ID to string, handles null/undefined values
const normalizeId = (value: unknown): string => String(value ?? "").trim();

// Cache of current user's IDs (id, phone, userId, _id, etc.) for message ownership check
const currentActorIds = new Set<string>(["user-me"]);
let actorIdsHydrated = false;

// Hydrate current actor IDs from user data
// Called once to populate cache with user's various ID formats
const hydrateCurrentActorIds = async () => {
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
  } finally {
    actorIdsHydrated = true;
  }
};

// Check if sender is current user by comparing IDs
const isCurrentActor = (senderId: unknown): boolean => {
  const normalized = normalizeId(senderId);
  return normalized.length > 0 && currentActorIds.has(normalized);
};

// Build stable message ID from backend message
// Uses messageId if available, otherwise creates composite ID from conversationId, senderId, createdAt, body, attachment
const buildStableMessageId = (apiMessage: any): string => {
  const directId = normalizeId(apiMessage?.messageId || apiMessage?.message_id || apiMessage?.id);
  if (directId) return directId;

  const conversationId = normalizeId(apiMessage?.conversationId || apiMessage?.conversation_id);
  const senderId = normalizeId(apiMessage?.senderId || apiMessage?.sender_id);
  const createdAt = normalizeId(apiMessage?.createdAt || apiMessage?.created_at);
  const body = normalizeId(apiMessage?.body);
  const attachmentKey = normalizeId(
    Array.isArray(apiMessage?.attachments) ? apiMessage?.attachments?.[0]?.key : "",
  );

  const composite = [conversationId, senderId, createdAt, body, attachmentKey]
    .filter(Boolean)
    .join("|");

  if (composite) return `msg_${composite}`;
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// Convert timestamp to milliseconds
// Handles number (ms), string (numeric or ISO date), returns current time if invalid
const toTimestampMs = (value: unknown): number => {
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
};

// Convert backend MessageResponseDto to frontend ChatMessage type
// Maps backend fields (messageId, conversationId, senderId, body, createdAt, etc.) to frontend format
// Handles attachment mapping, reply-to messages, and message type detection
export function toLegacyChatMessage(apiMessage: any): ChatMessage {
  const firstAttachment = Array.isArray(apiMessage?.attachments)
    ? apiMessage.attachments[0]
    : undefined;

  // Handle both snake_case (socket payload) and camelCase (API response)
  const senderId = apiMessage?.senderId || apiMessage?.sender_id;
  const body = apiMessage?.body ?? "";
  const createdAtRaw = apiMessage?.createdAt ?? apiMessage?.created_at ?? apiMessage?.ts ?? apiMessage?.timestamp ?? Date.now();
  const editedAtRaw = apiMessage?.editedAt ?? apiMessage?.edited_at ?? null;
  const attachmentType = firstAttachment?.type;
  const serverMessageId = normalizeId(apiMessage?.messageId || apiMessage?.message_id || apiMessage?.id);
  const messageType =
    attachmentType === "document"
      ? "file"
      : attachmentType === "audio"
        ? "voice"
      : attachmentType || "text";

  return {
    id: buildStableMessageId(apiMessage),
    serverMessageId: serverMessageId || undefined,
    conversationId: apiMessage?.conversationId || apiMessage?.conversation_id,
    fromMe: isCurrentActor(senderId),
    senderId: senderId,
    senderName: apiMessage?.senderName || apiMessage?.sender?.name || apiMessage?.sender?.fullName,
    senderAvatar: apiMessage?.senderAvatar || apiMessage?.sender?.avatarUrl || apiMessage?.sender?.avatar,
    type: (apiMessage?.messageType === 'system' || apiMessage?.message_type === 'system' || apiMessage?.type === 'system') ? 'system' :
           (apiMessage?.messageType === 'poll' || apiMessage?.message_type === 'poll' || apiMessage?.type === 'poll') ? 'poll' :
           (apiMessage?.messageType === 'invite' || apiMessage?.message_type === 'invite' || apiMessage?.type === 'invite') ? 'invite' : messageType,
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
    // System message fields
    messageType: apiMessage?.messageType,
    systemEventType: apiMessage?.systemEventType || apiMessage?.system_event_type,
    metadata: apiMessage?.metadata,
  };
}

// Fetch reply message details to get text and sender name
export async function enrichReplyToDetails(message: ChatMessage): Promise<ChatMessage> {
  if (!message.replyTo?.id || message.replyTo.text) {
    return message;
  }

  try {
    const replyMessageDetails = await messagesApi.getMessageDetails(
      message.conversationId || '',
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
          senderName: replyMsg.senderName || replyMsg.sender?.name || 'User',
          text: replyMsg.body || replyMsg.text || '',
        },
      };
    }
    return message;
  } catch (error) {
    return message;
  }
}



// Track open conversations for socket room management
const openConversations = new Set<string>();

// Map of pending ACK callbacks (resolve/reject) for sent messages
export const pendingAcks = new Map<
  string,
  { resolve: (msg: any) => void; reject: (err: any) => void }
>();

// Global socket instance
let socketInstance: Socket | null = null;
let listenersRegistered = false;
let registeredSocketId: string | null = null;

// NOTE: Heartbeat is now handled by usePresenceHeartbeat hook to avoid duplicate timers

// Deduplication service instance
const dedupService = getDeduplicationService();

// Re-export for backward compatibility (will be deprecated)
export const addProcessedMessageId = (messageId: string) =>
  dedupService.markProcessed(messageId);
export const isMessageProcessed = (messageId: string): boolean =>
  dedupService.isProcessed(messageId);

// Legacy cache - kept for backward compatibility, will be removed after migration
const recentMessageIds: string[] = [];
const RECENT_MESSAGE_CACHE_SIZE = 200;

// Build chat join payload for socket event
const buildChatJoinPayload = (conversationId: string): SocketChatJoinPayload => ({
  conversation_id: String(conversationId || "").trim(),
});

// Type for outgoing file attachments
type OutgoingFile = {
  uri?: string;
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number | string;
  fileSize?: number;
};

// Infer attachment type from MIME type (image, video, audio, document)
const inferAttachmentType = (mimeType?: string) => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

// Normalize outgoing file for upload
// Extracts URI, name, MIME type, and size from various possible formats
const normalizeOutgoingFile = (file: OutgoingFile) => {
  const uri = String(file?.uri || "").trim();
  const mimeType = String(file?.mimeType || file?.type || "").trim();
  const type = mimeType || "application/octet-stream";
  const size = Number(file?.size ?? file?.fileSize ?? 0);
  const nameFromUri = uri ? uri.split("/").pop() : "";
  const fallbackExt = type.includes("/") ? type.split("/")[1] : "bin";
  const name =
    String(file?.name || "").trim() ||
    nameFromUri ||
    `file_${Date.now()}.${fallbackExt}`;

  return {
    uri,
    name,
    type,
    size: Number.isFinite(size) && size > 0 ? size : 0,
    attachmentType: inferAttachmentType(type),
  };
};


// Sort messages by timestamp (ascending), use ID as tiebreaker
const sortMessagesAscending = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const timeDiff = Number(a.timestamp || 0) - Number(b.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
};

// Generate UUID v4 for local message IDs
// Uses crypto.randomUUID if available, falls back to manual generation
function generateUUID(): string {
  try {
    if (typeof globalThis?.crypto?.randomUUID === "function")
      return (globalThis.crypto as any).randomUUID();
  } catch {
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Ensure socket is connected and listeners are registered
// Hydrates current actor IDs, connects socket if needed, registers event listeners
async function ensureSocket() {
  await hydrateCurrentActorIds();
  if (!socketInstance) {
    socketInstance = await connectSocket();
  }
  
  const currentSocketId = (socketInstance as any)?.id || 'default';
  
  // Reset listenersRegistered flag if socket has changed (reconnected)
  if (registeredSocketId !== currentSocketId) {
    listenersRegistered = false;
    registeredSocketId = currentSocketId;
  }
  
  if (!listenersRegistered && socketInstance) {
    registerSocketListeners();
  }
  return socketInstance;
}

// Load initial messages for a conversation
// Fetches first 50 messages from API, converts to ChatMessage format
export async function loadInitialMessages(conversationId: string) {
  await hydrateCurrentActorIds();
  const normalizedConversationId = String(conversationId || "").trim();
  if (!normalizedConversationId) {
    return { messages: [], nextCursor: null, hasMore: false };
  }

  const resp = await messagesApi.getMessages(normalizedConversationId, 50);
  const payload = resp?.data ?? {};
  const messages = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
  // Don't filter deleted messages - they will be displayed as revoked
  const uiMessages = sortMessagesAscending(messages.map(toLegacyChatMessage));
  const hydratedMessages = uiMessages;

  openConversations.add(normalizedConversationId);
  
  const s = await ensureSocket();
  try {
    const joinPayload = buildChatJoinPayload(normalizedConversationId);
    s.emit("chat:join", joinPayload);
  } catch (e) {
  }

  return {
    messages: hydratedMessages,
    nextCursor: payload?.nextCursor ?? null,
    hasMore: Boolean(payload?.hasMore),
  };
}

// Fetch more messages for a conversation (pagination)
// Uses cursor for pagination, filters deleted messages, converts to ChatMessage format
export async function fetchMoreMessages(
  conversationId: string,
  cursor?: string,
  limit = 50,
) {
  await hydrateCurrentActorIds();
  const resp = await messagesApi.getMessages(conversationId, limit, cursor);
  const payload = resp?.data ?? {};
  const messages = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

  // Don't filter deleted messages - they will be displayed as revoked
  const uiMessages = sortMessagesAscending(messages.map(toLegacyChatMessage));
  return {
    messages: uiMessages,
    nextCursor: payload?.nextCursor ?? null,
    hasMore: Boolean(payload?.hasMore),
  };
}

// Send a message via socket
// Uploads attachments if provided, emits chat:send event, waits for ACK (15s timeout)
export async function sendMessage(
  conversationId: string,
  content: any,
  files?: any[],
  options?: {
    replyToMessage?: ChatMessage | null;
    forwardedFrom?: any;
    mentions?: Array<{ user_id: string; mention_type: 'user' | 'all'; offset: number; length: number }>;
  },
) {
  const socket = await ensureSocket();

  let attachments: any[] = [];
  if (files && files.length > 0) {
    let currentUserId = '';
    try {
      const user = await getCurrentUser();
      currentUserId = user?.id || (user as any)?._id || (user as any)?.userId || user?.phone || '';
    } catch (e) {
    }

    let fileIndex = 0;
    for (const rawFile of files as OutgoingFile[]) {
      const file = normalizeOutgoingFile(rawFile);
      if (!file.uri) continue;
      const mediaInput: MediaFileInput = {
        uri: file.uri,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      };
      const uploadResult = await uploadMedia(mediaInput, currentUserId, conversationId);

      const dto = buildAttachmentDto(uploadResult);
      attachments.push({
        key: dto.key,
        type: dto.type,
        name: dto.name,
        size: dto.size,
        content_type: dto.content_type,
        thumbnail_key: dto.thumbnail_key,
        visibility: dto.visibility,
        uri: file.uri,
        url: file.uri,
      });
      fileIndex += 1;
    }
  }

  const firstAttachmentType = attachments[0]?.type;
  const outgoingMessageType =
    firstAttachmentType === "document"
      ? "file"
      : firstAttachmentType === "audio"
        ? "voice"
        : firstAttachmentType || "text";

  const replyToMessageId = String(
    (options?.replyToMessage as any)?.serverMessageId ||
      options?.replyToMessage?.id ||
      "",
  ).trim();
  const localId = generateUUID();
  const optimisticMessage = {
    id: localId,
    conversationId,
    body: content || (files && files.length > 0 ? files[0].name : ""),
    attachments,
    createdAt: Date.now(),
    sender: { me: true },
    senderId: "user-me",
    type: outgoingMessageType,
    mentions: options?.mentions,
    replyTo: options?.replyToMessage
      ? {
          id: replyToMessageId || options.replyToMessage.id,
          senderId: options.replyToMessage.senderId,
          text: options.replyToMessage.text,
        }
      : undefined,
    status: "sending",
  };

  const uiOptimisticMessage = toLegacyChatMessage(optimisticMessage);

  const payload: Record<string, any> = {
    conversation_id: conversationId,
    message_id: localId,
    body: content || (files && files.length > 0 ? files[0].name : ""),
    sent_at: Date.now(),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    ...(options?.forwardedFrom ? { forwarded_from: options.forwardedFrom } : {}),
    ...(options?.mentions ? { mentions: options.mentions } : {}),
    attachments: attachments.map((a) => ({
      key: a.key,
      type: a.type || "document",
      name: a.name || "File",
      size: Number(a.size || 0),
      content_type: a.content_type || "application/octet-stream",
      thumbnail_key: a.thumbnail_key,
      visibility: a.visibility,
    })),
  };

  const sendPromise = new Promise<any>((resolve, reject) => {
    const ackTimeout = setTimeout(() => {
      pendingAcks.delete(localId);
      reject({ message_id: localId, error: "chat:ack timeout" });
    }, 15000);

    const safeResolve = (payloadAck: any) => {
      clearTimeout(ackTimeout);
      resolve(payloadAck);
    };
    const safeReject = (err: any) => {
      clearTimeout(ackTimeout);
      reject(err);
    };

    pendingAcks.set(localId, { resolve: safeResolve, reject: safeReject });
    try {
      socket.emit("chat:send", payload, (ack: any) => {
        if (ack && ack.status === "accepted") {
          const p = pendingAcks.get(localId);
          p?.resolve(ack);
          pendingAcks.delete(localId);
        } else if (ack && ack.status === "rejected") {
          const p = pendingAcks.get(localId);
          p?.reject(ack);
          pendingAcks.delete(localId);
        }
      });
    } catch (e) {
      clearTimeout(ackTimeout);
      pendingAcks.delete(localId);
      safeReject(e);
    }
  });

  return { optimisticMessage: uiOptimisticMessage, sendPromise };
}

// Register socket event handlers for chat events
// Sets up callbacks for message, update, delete, and reaction events
export function registerHandlers(handlers: {
  onMessage?: (msg: ChatMessage) => void;
  onMessageUpdated?: (msg: ChatMessage) => void;
  onMessageDeleted?: (info: any) => void;
  onReactionAdded?: (info: any) => void;
  onReactionRemoved?: (info: any) => void;
}) {
  _handlers = handlers;
  if (!listenersRegistered && socketInstance) {
    registerSocketListeners();
  }
}

// Global handlers for socket events
let _handlers: any = {};

// Register socket event listeners for chat events
// Sets up handlers for connect, chat:ack, chat:message, chat:edit, chat:delete, chat:react, presence:heartbeat
// Returns cleanup function to remove listeners
function registerSocketListeners() {
  const s = getSocket() || socketInstance;
  if (!s) {
    return () => {};
  }

  // Define handler functions so they can be removed later
  const handleConnect = () => {
    for (const conv of Array.from(openConversations)) {
      try {
        const joinPayload = buildChatJoinPayload(conv);
        s.emit("chat:join", joinPayload);
      } catch (e) {
      }
    }
    // NOTE: Heartbeat is now handled by usePresenceHeartbeat hook to avoid duplicate timers
  };

  const handleAck = (payload: any) => {
    const clientId = payload?.message_id;
    if (clientId) {
      const p = pendingAcks.get(clientId);
      if (p) {
        if (payload?.status === "rejected") p.reject(payload);
        else p.resolve(payload);
        pendingAcks.delete(clientId);
      }
    }
  };

  const handleMessage = async (payload: any) => {
    console.log('[handleMessage] Raw payload:', JSON.stringify(payload, null, 2));
    console.log('[handleMessage] type:', payload?.type, 'message_type:', payload?.message_type, 'sender_id:', payload?.sender_id);
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.id || payload?.message_id;
    const createdAt =
      payload?.created_at ?? payload?.createdAt ?? payload?.ts ?? payload?.timestamp;

    const messageKey = String(messageId || "");

    // Unified deduplication with store check
    if (messageKey) {
      const isDuplicate = await dedupService.checkAndMark(messageKey, {
        conversationId,
        checkStore: async () => {
          if (!conversationId) return false;
          const { useMessagesStore } = await import('../store/useMessagesStore');
          const existingMessages = useMessagesStore.getState().messagesByChatId[conversationId] || [];
          return existingMessages.some(m => m.id === messageKey || m.serverMessageId === messageKey);
        },
      });
      if (isDuplicate) {
        console.log('[handleMessage] Message already processed', messageKey);
        return;
      }
    }

    const hasAttachmentsInPayload =
      Array.isArray(payload?.attachments) && payload.attachments.length > 0;
    const requiresDetails = Boolean(
      conversationId &&
        messageId &&
        createdAt &&
        (hasAttachmentsInPayload || payload?.attachment_key || payload?.fileKey),
    );

    if (!requiresDetails) {
      const uiMessage = toLegacyChatMessage(payload);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      console.log('[handleMessage] Adding message to store (no details)', enrichedMessage);
      // Directly add to store instead of relying on _handlers
      const { useMessagesStore } = await import('../store/useMessagesStore');
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      // Update conversation list with last message
      await updateConversationLastMessage(enrichedMessage, payload);
      return;
    }

    try {
      const detailsResp = await messagesApi.getMessageDetails(
        conversationId,
        createdAt,
        messageId,
      );
      const fullMessage = detailsResp?.data || payload;
      const uiMessage = toLegacyChatMessage(fullMessage);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      console.log('[handleMessage] Adding message to store (with details)', enrichedMessage);
      // Directly add to store instead of relying on _handlers
      const { useMessagesStore } = await import('../store/useMessagesStore');
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      // Update conversation list with last message
      await updateConversationLastMessage(enrichedMessage, payload);
    } catch (e) {
      console.error('[handleMessage] Error fetching message details', e);
      const uiMessage = toLegacyChatMessage(payload);
      const enrichedMessage = await enrichReplyToDetails(uiMessage);
      console.log('[handleMessage] Adding message to store (fallback)', enrichedMessage);
      // Directly add to store instead of relying on _handlers
      const { useMessagesStore } = await import('../store/useMessagesStore');
      useMessagesStore.getState().addMessage(conversationId, enrichedMessage);
      // Update conversation list with last message
      await updateConversationLastMessage(enrichedMessage, payload);
    }
  };

  const handleMessageUpdated = async (payload: any) => {
    const uiMessage = toLegacyChatMessage({
      id: payload?.message_id,
      conversationId: payload?.conversation_id,
      body: payload?.body ,
      editedAt: payload?.edited_at,
      senderId: payload?.sender_id,
      createdAt: payload?.created_at,
      timestamp: payload?.timestamp,
    });
    const enrichedMessage = await enrichReplyToDetails(uiMessage);
    _handlers.onMessageUpdated?.(enrichedMessage);
  };

  const handleMessageDeleted = (payload: any) => {
    const messageId = payload?.message_id;
    const conversationId = payload?.conversation_id;
    const deletedAt = payload?.deleted_at;

    if (!messageId || !conversationId) return;

    // Apply same logic as revokeMessage for real-time sync
    const { revokeMessage, removePinnedMessage, isMessagePinned } = require('../store/useMessagesStore').useMessagesStore.getState();
    
    // Auto unpin when message is deleted
    if (isMessagePinned(conversationId, messageId)) {
      removePinnedMessage(conversationId, messageId);
    }

    // Apply delete/revoke logic
    revokeMessage(conversationId, messageId);

    _handlers.onMessageDeleted?.({
      messageId,
      conversationId,
      deletedAt,
    });
  };

  const handleReactionAdded = (payload: any) => {
    _handlers.onReactionAdded?.({
      messageId: payload?.message_id,
      conversationId: payload?.conversation_id,
      userId: payload?.user_id,
      reactionType: payload?.reaction_type,
      createdAt: payload?.created_at,
    });
  };

  const handleReactionRemoved = (payload: any) => {
    _handlers.onReactionRemoved?.({
      messageId: payload?.message_id,
      conversationId: payload?.conversation_id,
      userId: payload?.user_id,
      reactionType: payload?.reaction_type,
      createdAt: payload?.created_at,
    });
  };

  const handleSystemMessage = async (payload: any) => {
    console.log('[handleSystemMessage] Raw payload:', JSON.stringify(payload, null, 2));
    console.log('[handleSystemMessage] type:', payload?.type, 'message_type:', payload?.message_type, 'messageType:', payload?.messageType);
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.message_id || payload?.messageId || payload?.id;

    const messageKey = String(messageId || "");

    // Unified deduplication with store check
    if (messageKey) {
      const isDuplicate = await dedupService.checkAndMark(messageKey, {
        conversationId,
        checkStore: async () => {
          if (!conversationId) return false;
          const { useMessagesStore } = await import('../store/useMessagesStore');
          const existingMessages = useMessagesStore.getState().messagesByChatId[conversationId] || [];
          return existingMessages.some(m => m.id === messageKey || m.serverMessageId === messageKey);
        },
      });
      if (isDuplicate) {
        console.log('[handleSystemMessage] Message already processed', messageKey);
        return;
      }
    }

    // Convert to UI message format
    const uiMessage = toLegacyChatMessage(payload);
    console.log('[handleSystemMessage] Converted uiMessage:', { type: uiMessage.type, messageType: uiMessage.messageType, senderId: uiMessage.senderId });
    const enrichedMessage = await enrichReplyToDetails(uiMessage);

    // Add to store
    const { useMessagesStore } = await import('../store/useMessagesStore');
    useMessagesStore.getState().addMessage(conversationId, enrichedMessage);

    // Update conversation list
    await updateConversationLastMessage(enrichedMessage, payload);
  };

  const handleMessageRejected = (payload: SocketChatMessageRejectedEvent) => {
    const { message_id, conversation_id, reason, labels } = payload;
    if (!conversation_id || !message_id) return;

    // 1. Remove optimistic bubble from store
    const { useMessagesStore } = require('../store/useMessagesStore');
    useMessagesStore.getState().removeMessage(conversation_id, message_id);

    // 2. Clean up pending acks if still there
    if (message_id) {
      const p = pendingAcks.get(message_id);
      if (p) {
        p.reject(payload);
        pendingAcks.delete(message_id);
      }
    }

    // 3. Toast with reason
    const reasonText =
      reason === 'moderation' ? 'vi phạm tiêu chuẩn cộng đồng'
      : reason === 'rate_limit' ? 'quá nhiều yêu cầu'
      : reason === 'unauthorized' ? 'không có quyền'
      : reason || 'không xác định';
    const labelText = labels?.length ? ` (${labels.join(', ')})` : '';
    toast.error(`Tin nhắn bị chặn: ${reasonText}${labelText}`);
  };

  // Register all listeners
  // NOTE: chat:message is now handled here directly (useChatSocket is deprecated)
  s.on("connect", handleConnect);
  s.on("chat:ack", handleAck);
  s.on("chat:message", handleMessage);
  s.on("chat:message:updated", handleMessageUpdated);
  s.on("chat:message:deleted", handleMessageDeleted);
  s.on("chat:reaction:added", handleReactionAdded);
  s.on("chat:reaction:removed", handleReactionRemoved);
  s.on("chat:system-message", handleSystemMessage);
  s.on(WsEvents.ChatMessageRejected, handleMessageRejected);

  listenersRegistered = true;

  // Return cleanup function
  return () => {
    s.off("connect", handleConnect);
    s.off("chat:ack", handleAck);
    s.off("chat:message", handleMessage);
    s.off("chat:message:updated", handleMessageUpdated);
    s.off("chat:message:deleted", handleMessageDeleted);
    s.off("chat:reaction:added", handleReactionAdded);
    s.off("chat:reaction:removed", handleReactionRemoved);
    s.off("chat:system-message", handleSystemMessage);
    s.off(WsEvents.ChatMessageRejected, handleMessageRejected);
    listenersRegistered = false;
  };
}

// Leave a conversation via API
// Removes from open conversations cache, calls backend API
export async function leaveConversation(conversationId: string) {
  openConversations.delete(conversationId);
  return conversationsApi.leaveConversation(conversationId);
}

// Edit a message via socket
// Emits chat:edit event with message ID, conversation ID, new body, and created timestamp
export async function editMessage(
  conversationId: string,
  messageId: string,
  newBody: string,
  createdAt: number,
) {
  const socket = await ensureSocket();
  socket.emit("chat:edit", {
    message_id: messageId,
    conversation_id: conversationId,
    new_body: newBody,
    created_at: createdAt,
  });
}

// Delete a message via socket
// Emits chat:delete event with message ID, conversation ID, and created timestamp
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  createdAt: number,
) {
  const socket = await ensureSocket();
  socket.emit("chat:delete", {
    message_id: messageId,
    conversation_id: conversationId,
    created_at: createdAt,
  });
}

// Add reaction to a message via socket
// Emits chat:react event with message ID, conversation ID, and reaction type
export async function reactMessage(
  conversationId: string,
  messageId: string,
  reactionType: "like" | "love" | "haha" | "wow" | "sad" | "angry",
) {
  const socket = await ensureSocket();
  socket.emit("chat:react", {
    message_id: messageId,
    conversation_id: conversationId,
    reaction_type: reactionType,
  });
}

// Remove reaction from a message via socket
// Emits chat:unreact event with message ID and conversation ID
export async function unreactMessage(
  conversationId: string,
  messageId: string,
) {
  const socket = await ensureSocket();
  socket.emit("chat:unreact", {
    message_id: messageId,
    conversation_id: conversationId,
  });
}

// Forward a message to one or more conversations
// Uses Backend's /messages/forward API with proper payload structure
// Backend will handle cloning attachments, creating forwarded_from metadata, and emitting Kafka event

// Debug counter for forward operations
let forwardCallCount = 0;

export async function forwardMessage(
  originalMessage: any,
  targetConversationIds: string | string[],
) {
  forwardCallCount++;
  // Support single string or array of conversation IDs
  const targets = Array.isArray(targetConversationIds) ? targetConversationIds : [targetConversationIds];

  // Generate idempotency key for forward operation
  const forwardId = generateUUID();

  // Get source message ID from serverMessageId or id
  const sourceMessageId = originalMessage.serverMessageId || originalMessage.id;

  if (!sourceMessageId) {
    throw new Error("Source message ID is required for forwarding");
  }


  // Try to fetch message details first to verify it exists
  if (originalMessage.conversationId && originalMessage.timestamp) {
    try {
      const messageDetails = await messagesApi.getMessageDetails(
        originalMessage.conversationId,
        originalMessage.timestamp,
        sourceMessageId
      );
    } catch (error) {
      throw new Error('SOURCE_NOT_FOUND');
    }
  }

  // Build targets array with generated message IDs
  const targetPayloads = targets.map((conversationId) => ({
    message_id: generateUUID(),
    conversation_id: conversationId,
  }));

  const payload = {
    forward_id: forwardId,
    source_message_id: sourceMessageId,
    targets: targetPayloads,
  };

  try {
    const response = await messagesApi.forwardMessage(payload);
    return response?.data || response;
  } catch (error: any) {
    throw error;
  }
}

// Reset chat runtime state
// Clears all caches, resets socket, clears pending ACKs, and reinitializes actor IDs
export async function fetchConversations() {
  const response = await conversationsApi.getConversations();
  return mapConversationsListFromApi(response.data);
}

export async function fetchAllMessages(): Promise<Record<string, ChatMessage[]>> {
  const convResp = await conversationsApi.getConversations();
  const conversations = mapConversationsListFromApi(convResp.data);
  const result: Record<string, ChatMessage[]> = {};
  await Promise.all(conversations.map(async (conv) => {
    try {
      const msgResp = await messagesApi.getMessages(conv.conversationId, 50);
      const payload = msgResp?.data ?? {};
      const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.messages) ? payload.messages : [];
      result[conv.conversationId] = items.map(toLegacyChatMessage);
    } catch {
      result[conv.conversationId] = [];
    }
  }));
  return result;
}

export async function fetchContacts() {
  const response = await friendsApi.getFriends();
  return { users: response.data as UserV2[] };
}

export async function getMessageReactions(messageId: string) {
  const response = await messagesApi.getMessageReactions(messageId);
  return response.data as MessageReactionsResponseDto;
}

export async function initChat(socket?: Socket) {
  await ensureSocket();
}

export async function markConversationAsRead(conversationId: string) {
  await conversationsApi.markAsRead(conversationId);
}

export function resetChatRuntime() {
  openConversations.clear();
  recentMessageIds.splice(0, recentMessageIds.length);
  dedupService.clear(); // Clear unified deduplication cache
  pendingAcks.forEach((p) => p.reject({ error: "runtime reset" }));
  pendingAcks.clear();
  _handlers = {};

  // NOTE: Heartbeat is now handled by usePresenceHeartbeat hook, no cleanup needed here

  socketInstance = null;
  listenersRegistered = false;

  currentActorIds.clear();
  currentActorIds.add("user-me");
  actorIdsHydrated = false;
}


export default {
  loadInitialMessages,
  fetchMoreMessages,
  fetchConversations,
  fetchAllMessages,
  fetchContacts,
  getMessageReactions,
  initChat,
  markConversationAsRead,
  sendMessage,
  registerHandlers,
  resetChatRuntime,
  forwardMessage,
  editMessage,
  deleteMessage,
  reactMessage,
  unreactMessage,
  leaveConversation,
};



// Update conversation list with last message preview
async function updateConversationLastMessage(enrichedMessage: any, payload: any) {
  const { detectPreviewTypeFromMessage, formatPreviewContent } = await import('../utils/messagePreviewFormatter');
  const { useChatsStore } = await import('../store/useChatsStore');
  
  const conversationId = payload?.conversation_id || payload?.conversationId || enrichedMessage?.conversationId;
  const createdAt = typeof payload?.created_at === 'number' ? payload?.created_at :
                    typeof payload?.createdAt === 'number' ? payload?.createdAt :
                    typeof payload?.ts === 'number' ? payload?.ts :
                    typeof enrichedMessage?.timestamp === 'number' ? enrichedMessage?.timestamp : Date.now();
  
  if (!conversationId) return;
  
  // Format preview content based on message type
  const previewContent = formatPreviewContent(enrichedMessage);
  const previewType = detectPreviewTypeFromMessage(enrichedMessage);
  
  // Check if message is from me
  const isFromMe = enrichedMessage?.fromMe === true || enrichedMessage?.sender?.me === true;
  
  // Update conversation list
  useChatsStore.getState().updateLastMessage(
    conversationId,
    previewContent,
    previewType,
    createdAt,
    payload?.sender_id || payload?.senderId || enrichedMessage?.senderId,
    payload?.sender_name || payload?.senderName || enrichedMessage?.senderName,
    !isFromMe // Increment unread if not from me
  );
}





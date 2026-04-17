import { Socket } from "socket.io-client";
import { ContactUser } from "../types/ContactUser";
import type { ChatMessage, ConversationV2 } from "../types/chat";
import type { SocketChatJoinPayload } from "../types/dto/SocketDTO";
import type { MessageReactionsResponseDto } from "../types/dto/ApiDTO";
import { mapConversationsListFromApi } from "../types/mappers/DTOMappers";
import type { MediaFileInput } from "../types/media";
import { getCurrentUser } from "./authService";
import * as conversationsApi from "./conversationsApi";
import * as friendsApi from "./friendsApi";
import { buildAttachmentDto, uploadMedia } from "./mediaService";
import * as messagesApi from "./messagesApi";
import { connectSocket, getSocket } from "./socket";

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
  const directId = normalizeId(apiMessage?.messageId);
  if (directId) return directId;

  const conversationId = normalizeId(apiMessage?.conversationId);
  const senderId = normalizeId(apiMessage?.senderId);
  const createdAt = normalizeId(apiMessage?.createdAt);
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
function toLegacyChatMessage(apiMessage: any): ChatMessage {
  const firstAttachment = Array.isArray(apiMessage?.attachments)
    ? apiMessage.attachments[0]
    : undefined;

  const senderId = apiMessage?.senderId;
  const body = apiMessage?.body ?? "";
  const createdAtRaw = apiMessage?.createdAt ?? Date.now();
  const editedAtRaw = apiMessage?.editedAt ?? null;
  const attachmentType = firstAttachment?.type;
  const serverMessageId = normalizeId(apiMessage?.messageId);
  const messageType =
    attachmentType === "document"
      ? "file"
      : attachmentType === "audio"
        ? "voice"
      : attachmentType || "text";

  return {
    id: buildStableMessageId(apiMessage),
    serverMessageId: serverMessageId || undefined,
    conversationId: apiMessage?.conversationId,
    fromMe: isCurrentActor(senderId),
    senderId: senderId,
    type: messageType,
    text: body,
    timestamp: toTimestampMs(createdAtRaw),
    fileInfo: firstAttachment
      ? {
          uri: firstAttachment.url || firstAttachment.key || "",
          name: firstAttachment.name || "File",
          size: firstAttachment.size || 0,
          mimeType: firstAttachment.contentType || firstAttachment.type || "",
        }
      : undefined,
    replyTo: apiMessage?.replyToMessageId
      ? { id: apiMessage.replyToMessageId }
      : undefined,
    reactions: apiMessage?.reactions,
    status: apiMessage?.status,
    isEdited: Boolean(editedAtRaw),
    editedAt: editedAtRaw ? toTimestampMs(editedAtRaw) : undefined,
    isRevoked: Boolean(apiMessage?.isDeleted),
    attachments: Array.isArray(apiMessage?.attachments) ? apiMessage.attachments : undefined,
  };
}

// Track open conversations for socket room management
const openConversations = new Set<string>();

// Map of pending ACK callbacks (resolve/reject) for sent messages
const pendingAcks = new Map<
  string,
  { resolve: (msg: any) => void; reject: (err: any) => void }
>();

// Global socket instance
let socketInstance: Socket | null = null;
let listenersRegistered = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// Cache of recent message IDs to prevent duplicate processing
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
  if (!listenersRegistered) registerSocketListeners();
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
  // Filter out deleted messages
  const activeMessages = messages.filter(m => !m?.isDeleted);
  const uiMessages = sortMessagesAscending(activeMessages.map(toLegacyChatMessage));

  openConversations.add(normalizedConversationId);
  const s = await ensureSocket();
  try {
    s.emit("chat:join", buildChatJoinPayload(normalizedConversationId));
  } catch (e) {
  }

  return {
    messages: uiMessages,
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

  // Filter out deleted messages
  const activeMessages = messages.filter(m => !m?.isDeleted);
  const uiMessages = sortMessagesAscending(activeMessages.map(toLegacyChatMessage));
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

  const payload = {
    conversation_id: conversationId,
    message_id: localId,
    body: content || (files && files.length > 0 ? files[0].name : ""),
    sent_at: Date.now(),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
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
function registerSocketListeners() {
  const s = getSocket() || socketInstance;
  if (!s) return;

  s.on("connect", () => {
    for (const conv of Array.from(openConversations)) {
      try {
        s.emit("chat:join", buildChatJoinPayload(conv));
      } catch (e) {
      }
    }
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      try {
        s.emit("presence:heartbeat", { ts: Date.now() });
      } catch (e) {
      }
    }, 30_000);
  });

  s.on("chat:ack", (payload: any) => {
    const clientId = payload?.message_id;
    if (clientId) {
      const p = pendingAcks.get(clientId);
      if (p) {
        if (payload?.status === "rejected") p.reject(payload);
        else p.resolve(payload);
        pendingAcks.delete(clientId);
      }
    }
  });

  s.on("chat:message", async (payload: any) => {
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.id || payload?.message_id;
    const createdAt =
      payload?.created_at ?? payload?.createdAt ?? payload?.ts ?? payload?.timestamp;

    const messageKey = String(messageId || "");
    if (messageKey && recentMessageIds.includes(messageKey)) {
      return;
    }

    if (messageKey) {
      recentMessageIds.push(messageKey);
      if (recentMessageIds.length > RECENT_MESSAGE_CACHE_SIZE) {
        recentMessageIds.shift();
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
      _handlers.onMessage?.(uiMessage);
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
      _handlers.onMessage?.(uiMessage);
    } catch (e) {
      const uiMessage = toLegacyChatMessage(payload);
      _handlers.onMessage?.(uiMessage);
    }
  });

  s.on("chat:message:updated", (payload: any) => {
    const uiMessage = toLegacyChatMessage({
      id: payload?.message_id,
      conversationId: payload?.conversation_id,
      body: payload?.body ,
      editedAt: payload?.edited_at,
      senderId: payload?.sender_id,
      createdAt: payload?.created_at,
      timestamp: payload?.timestamp,
    });
    _handlers.onMessageUpdated?.(uiMessage);
  });

  s.on("chat:message:deleted", (payload: any) => {
    _handlers.onMessageDeleted?.({
      messageId: payload?.message_id,
      conversationId: payload?.conversation_id,
      deletedAt: payload?.deleted_at,
    });
  });

  s.on("chat:reaction:added", (payload: any) => {
    _handlers.onReactionAdded?.({
      messageId: payload?.message_id,
      conversationId: payload?.conversation_id,
      userId: payload?.user_id,
      reactionType: payload?.reaction_type,
      createdAt: payload?.created_at,
    });
  });

  s.on("chat:reaction:removed", (payload: any) => {
    _handlers.onReactionRemoved?.({
      messageId: payload?.message_id,
      conversationId: payload?.conversation_id,
      userId: payload?.user_id,
    });
  });

  listenersRegistered = true;
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

// Forward a message to another conversation
// Extracts content and attachments from original message, sends to target conversation via socket
export async function forwardMessage(
  originalMessage: any,
  targetConversationId: string,
) {
  const socket = await ensureSocket();
  const messageId = generateUUID();
  const sentAt = Date.now();

  // Extract message content and attachments
  const body = originalMessage.text || originalMessage.content || '';
  const attachments = originalMessage.attachments || (originalMessage.attachment ? [originalMessage.attachment] : []);

  // Prepare attachments for forward - filter out undefined/null attachments without key
  const preparedAttachments = attachments
    .filter((att: any) => att && att.key) // Filter out null/undefined and attachments without key
    .map((att: any) => ({
      key: att.key,
      type: att.type,
      name: att.name,
      size: att.size,
      content_type: att.content_type || att.contentType,
      thumbnail_key: att.thumbnail_key || att.thumbnailKey,
      visibility: att.visibility || 'public',
    }));

  const payload = {
    message_id: messageId,
    conversation_id: targetConversationId,
    body,
    sent_at: sentAt,
    attachments: preparedAttachments.length > 0 ? preparedAttachments : undefined,
  };

  socket.emit("chat:send", payload);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Forward timeout"));
    }, 10000);

    socket.once(`chat:ack`, (ack: any) => {
      if (ack.message_id === messageId) {
        clearTimeout(timeout);
        if (ack.status === 'accepted') {
          resolve(ack);
        } else {
          reject(new Error(ack.reason || 'Forward failed'));
        }
      }
    });
  });
}

// Reset chat runtime state
// Clears all caches, resets socket, clears pending ACKs, and reinitializes actor IDs
export function resetChatRuntime() {
  openConversations.clear();
  recentMessageIds.splice(0, recentMessageIds.length);
  pendingAcks.forEach((p) => p.reject({ error: "runtime reset" }));
  pendingAcks.clear();
  _handlers = {};

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  socketInstance = null;
  listenersRegistered = false;

  currentActorIds.clear();
  currentActorIds.add("user-me");
  actorIdsHydrated = false;
}


export default {
  loadInitialMessages,
  fetchMoreMessages,
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

/**
 * GET /api/conversations
 * Trả về danh sách cuộc hội thoại của current user.
 */
export async function fetchConversations(): Promise<ConversationV2[]> {
  try {
    const resp = await conversationsApi.getConversations({
      page: 1,
      limit: 50,
    });

    const payload = resp?.data;

    if (!payload) return [];

    if (Array.isArray(payload.data) || Array.isArray(payload.conversations)) {
      return mapConversationsListFromApi(payload);
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * GET /api/conversations/:conversationId/messages
 * Trả về danh sách tin nhắn trong một cuộc hội thoại.
 */
export async function fetchMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  try {
    const resp = await messagesApi.getMessages(conversationId, 50);
    const payload = resp?.data;

    if (!payload) return [];

    let messages: any[] = [];
    if (Array.isArray(payload.data)) {
      messages = payload.data;
    } else if (Array.isArray(payload.messages)) {
      messages = payload.messages;
    }

    // Filter out deleted messages
    const activeMessages = messages.filter(m => !m?.isDeleted && !m?.is_deleted);
    return activeMessages.map(toLegacyChatMessage);
  } catch (e) {
    return [];
  }
}

/**
 * GET /api/conversations/:conversationId/messages (tất cả conversations)
 * Trả về toàn bộ messages group theo conversationId.
 */
export async function fetchAllMessages(): Promise<
  Record<string, ChatMessage[]>
> {
  try {
    const convResp = await conversationsApi.getConversations({
      page: 1,
      limit: 100,
    });

    const convs =
      mapConversationsListFromApi(
        convResp?.data?.data || convResp?.data?.conversations || [],
      );

    const result: Record<string, ChatMessage[]> = {};

    await Promise.all(
      convs.map(async (c: ConversationV2) => {
        if (!c.conversationId) return;
        try {
          const msgResp = await messagesApi.getMessages(
            c.conversationId,
            50
          );

          const payload = msgResp?.data;

          const list = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.messages)
                ? payload.messages
                : [];
          // Filter out deleted messages
          const activeMessages = list.filter(m => !m?.isDeleted && !m?.is_deleted);
          result[c.conversationId] = activeMessages.map(toLegacyChatMessage);
        } catch {
          result[c.conversationId] = [];
        }
      })
    );

    return result;
  } catch (e) {
    return {};
  }
}

/**
 * GET /api/contacts
 * Trả về danh sách bạn bè / users.
 */
export async function fetchContacts(): Promise<{ users: ContactUser[] }> {
  try {
    const resp = await friendsApi.getFriendsList({ page: 1, limit: 100 });
    const payload = resp?.data;

    const list = Array.isArray(payload?.data) ? payload.data : [];

    if (!Array.isArray(list)) {
      return { users: [] };
    }

    const users: ContactUser[] = list.map((u: any) => {
      const id = u.id || u._id;

      const normalizeAvatarUrl = (avatar?: string): string | null => {
        if (!avatar) return null;
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
          return avatar;
        }
        return 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/' + avatar.replace(/^\//, '');
      };

      return {
        id,
        fullName:
          u.fullName ||
          u.name ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          "Unknown",

        avatar: normalizeAvatarUrl(u.avatarUrl || u.avatar),

        status: u.status ?? "offline",

        lastSeen: u.lastSeen ?? null,
      };
    });

    return { users };
  } catch (e) {
    return { users: [] };
  }
}

export async function getMessageReactions(
  messageId: string,
): Promise<MessageReactionsResponseDto | null> {
  try {
    const response = await messagesApi.getMessageReactions(messageId);
    return response?.data as MessageReactionsResponseDto;
  } catch (error) {
    console.error('[chatService] getMessageReactions error:', error);
    return null;
  }
}



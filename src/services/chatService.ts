import { Socket } from "socket.io-client";
import { ContactUser } from "../types/ContactUser";
import type { ChatMessage, ConversationV2 } from "../types/chat";
import type { SocketChatJoinPayload } from "../types/dto/SocketDTO";
import { mapConversationsListFromApi } from "../types/mappers/DTOMappers";
import type { MediaFileInput } from "../types/media";
import { getCurrentUser } from "./authService";
import * as conversationsApi from "./conversationsApi";
import * as friendsApi from "./friendsApi";
import { buildAttachmentDto, uploadMedia } from "./mediaService";
import * as messagesApi from "./messagesApi";
import { connectSocket, getSocket } from "./socket";

const normalizeId = (value: unknown): string => String(value ?? "").trim();
const currentActorIds = new Set<string>(["user-me"]);
let actorIdsHydrated = false;

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

const isCurrentActor = (senderId: unknown): boolean => {
  const normalized = normalizeId(senderId);
  return normalized.length > 0 && currentActorIds.has(normalized);
};

const buildStableMessageId = (apiMessage: any): string => {
  const directId = normalizeId(
    apiMessage?.messageId ?? apiMessage?.message_id ?? apiMessage?.id,
  );
  if (directId) return directId;

  const conversationId = normalizeId(
    apiMessage?.conversationId ?? apiMessage?.conversation_id,
  );
  const senderId = normalizeId(
    apiMessage?.senderId ??
      apiMessage?.sender_id ??
      apiMessage?.sender?.id ??
      apiMessage?.sender?.userId ??
      apiMessage?.user_id ??
      apiMessage?.author_id,
  );
  const createdAt = normalizeId(
    apiMessage?.createdAt ??
      apiMessage?.created_at ??
      apiMessage?.sent_at ??
      apiMessage?.timestamp,
  );
  const body = normalizeId(apiMessage?.body ?? apiMessage?.text ?? apiMessage?.content);
  const attachmentKey = normalizeId(
    Array.isArray(apiMessage?.attachments) ? apiMessage?.attachments?.[0]?.key : "",
  );

  const composite = [conversationId, senderId, createdAt, body, attachmentKey]
    .filter(Boolean)
    .join("|");

  if (composite) return `msg_${composite}`;
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

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

function toLegacyChatMessage(apiMessage: any): ChatMessage {
  const firstAttachment = Array.isArray(apiMessage?.attachments)
    ? apiMessage.attachments[0]
    : undefined;
  const senderId =
    apiMessage?.senderId ??
    apiMessage?.sender_id ??
    apiMessage?.sender?.id ??
    apiMessage?.sender?.userId ??
    apiMessage?.user_id ??
    apiMessage?.author_id;
  const body = apiMessage?.body ?? apiMessage?.text ?? apiMessage?.content ?? "";
  const createdAtRaw =
    apiMessage?.createdAt ??
    apiMessage?.created_at ??
    apiMessage?.sent_at ??
    apiMessage?.timestamp ??
    Date.now();
  const editedAtRaw =
    apiMessage?.editedAt ??
    apiMessage?.edited_at ??
    null;
  const attachmentType = firstAttachment?.type;
  const serverMessageId = normalizeId(
    apiMessage?.messageId ?? apiMessage?.message_id ?? apiMessage?.id,
  );
  const messageType =
    attachmentType === "document"
      ? "file"
      : attachmentType === "audio"
        ? "voice"
      : attachmentType || apiMessage?.type || "text";

  return {
    id: buildStableMessageId(apiMessage),
    serverMessageId: serverMessageId || undefined,
    conversationId: apiMessage?.conversationId ?? apiMessage?.conversation_id,
    fromMe:
      apiMessage?.fromMe === true ||
      apiMessage?.sender?.me === true ||
      isCurrentActor(senderId),
    senderId: senderId,
    type: messageType,
    text: body,
    timestamp: toTimestampMs(createdAtRaw),
    fileInfo: firstAttachment
      ? {
          uri:
            firstAttachment.url ||
            firstAttachment.uri ||
            firstAttachment.thumbnail_url ||
            firstAttachment.thumbnail_key ||
            firstAttachment.key ||
            "",
          name: firstAttachment.name || "File",
          size: firstAttachment.size || 0,
          mimeType:
            firstAttachment.contentType ||
            firstAttachment.content_type ||
            firstAttachment.mimeType ||
            firstAttachment.type ||
            "",
        }
      : undefined,
    replyTo:
      apiMessage?.replyTo ||
      (apiMessage?.reply_to
        ? {
            id: apiMessage.reply_to?.id || apiMessage.reply_to?.message_id,
            senderId: apiMessage.reply_to?.sender_id || apiMessage.reply_to?.senderId,
            senderName: apiMessage.reply_to?.sender_name || apiMessage.reply_to?.senderName,
            text: apiMessage.reply_to?.body || apiMessage.reply_to?.text,
          }
        : apiMessage?.replyToMessage
          ? {
              id: apiMessage.replyToMessage?.id || apiMessage.replyToMessage?.message_id,
              senderId:
                apiMessage.replyToMessage?.sender_id || apiMessage.replyToMessage?.senderId,
              senderName:
                apiMessage.replyToMessage?.sender_name || apiMessage.replyToMessage?.senderName,
              text: apiMessage.replyToMessage?.body || apiMessage.replyToMessage?.text,
            }
          : apiMessage?.reply_to_message_id || apiMessage?.replyToMessageId
            ? {
                id: apiMessage?.reply_to_message_id || apiMessage?.replyToMessageId,
              }
            : undefined),
    reactions: apiMessage?.reactions,
    status: apiMessage?.status,
    isEdited: Boolean(apiMessage?.isEdited || apiMessage?.is_edited || editedAtRaw),
    editedAt: editedAtRaw ? toTimestampMs(editedAtRaw) : undefined,
    deletedFor: apiMessage?.deletedFor,
    isRevoked: Boolean(apiMessage?.isDeleted || apiMessage?.is_deleted || apiMessage?.isRevoked),
    attachments: Array.isArray(apiMessage?.attachments) ? apiMessage.attachments : undefined,
  };
}

const openConversations = new Set<string>();
const pendingAcks = new Map<
  string,
  { resolve: (msg: any) => void; reject: (err: any) => void }
>();

let socketInstance: Socket | null = null;
let listenersRegistered = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const recentMessageIds: string[] = [];
const RECENT_MESSAGE_CACHE_SIZE = 200;

const buildChatJoinPayload = (conversationId: string): SocketChatJoinPayload => ({
  conversation_id: String(conversationId || "").trim(),
});

type OutgoingFile = {
  uri?: string;
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number | string;
  fileSize?: number;
};

const inferAttachmentType = (mimeType?: string) => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

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

const buildFallbackAttachment = (
  file: ReturnType<typeof normalizeOutgoingFile>,
  conversationId: string,
  index: number,
) => {
  const safeName = String(file.name || `file_${Date.now()}`).replace(/\s+/g, "_");
  const fallbackKey = `uploads/${conversationId}/${Date.now()}_${index}_${safeName}`;
  return {
    key: fallbackKey,
    type: file.attachmentType,
    name: file.name || "File",
    size: Number(file.size || 0),
    content_type: file.type || "application/octet-stream",
    uri: file.uri,
    url: file.uri,
    thumbnail_key: fallbackKey,
  };
};

const sortMessagesAscending = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const timeDiff = Number(a.timestamp || 0) - Number(b.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
};

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

async function ensureSocket() {
  await hydrateCurrentActorIds();
  if (!socketInstance) {
    socketInstance = await connectSocket();
  }
  if (!listenersRegistered) registerSocketListeners();
  return socketInstance;
}

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
  const uiMessages = sortMessagesAscending(messages.map(toLegacyChatMessage));

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

  const uiMessages = sortMessagesAscending(messages.map(toLegacyChatMessage));
  return {
    messages: uiMessages,
    nextCursor: payload?.nextCursor ?? null,
    hasMore: Boolean(payload?.hasMore),
  };
}

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
      if (__DEV__) {
      }
    } catch (e) {
    }

    if (!currentUserId) {
    }

    let fileIndex = 0;
    for (const rawFile of files as OutgoingFile[]) {
      const file = normalizeOutgoingFile(rawFile);
      if (!file.uri) continue;

      if (__DEV__) {
      }

      try {
        const mediaInput: MediaFileInput = {
          uri: file.uri,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        };
        const uploadResult = await uploadMedia(mediaInput, currentUserId, conversationId);

        if (__DEV__) {
        }

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
      } catch (uploadErr) {
        throw uploadErr;
      } finally {
        fileIndex += 1;
      }
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
      if (__DEV__) {
      }
      socket.emit("chat:send", payload, (ack: any) => {
        if (__DEV__) {
        }
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

let _handlers: any = {};

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
    if (__DEV__) {
    }
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
    if (__DEV__) {
    }
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
      body: payload?.new_body,
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

export async function leaveConversation(conversationId: string) {
  openConversations.delete(conversationId);
  return conversationsApi.leaveConversation(conversationId);
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newBody: string,
) {
  const socket = await ensureSocket();
  socket.emit("chat:edit", {
    message_id: messageId,
    conversation_id: conversationId,
    new_body: newBody,
    created_at: Date.now(),
  });
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
) {
  const socket = await ensureSocket();
  return new Promise((resolve, reject) => {
    const ackTimeout = setTimeout(() => {
      reject({ message_id: messageId, error: 'Delete ACK timeout' });
    }, 15000);

    socket.emit("chat:delete", {
      message_id: messageId,
      conversation_id: conversationId,
      created_at: Date.now(),
    }, (ack: any) => {
      clearTimeout(ackTimeout);
      if (ack?.status === 'accepted') {
        resolve(ack);
      } else {
        reject(ack || { message_id: messageId, error: 'Delete failed' });
      }
    });
  });
}

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

export async function unreactMessage(
  conversationId: string,
  messageId: string,
  reactionType: "like" | "love" | "haha" | "wow" | "sad" | "angry",
) {
  const socket = await ensureSocket();
  socket.emit("chat:unreact", {
    message_id: messageId,
    conversation_id: conversationId,
  });
}

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

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.messages)) {
      return payload.messages;
    }
    return [];
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
          result[c.conversationId] = list.map(toLegacyChatMessage);
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

      return {
        id,
        fullName:
          u.fullName ||
          u.name ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          "Unknown",

        avatar:
          u.avatarUrl ||
          u.avatar ||
          `https://i.pravatar.cc/150?u=${id || "default"}`,

        status: u.status ?? "offline",

        lastSeen: u.lastSeen ?? null,
      };
    });

    return { users };
  } catch (e) {
    return { users: [] };
  }
}



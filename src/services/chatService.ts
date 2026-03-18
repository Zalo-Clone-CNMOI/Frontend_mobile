import { Socket } from "socket.io-client";
import { ContactUser } from './../types/ContactUser';
import * as conversationsApi from "./conversationsApi";
import * as friendsApi from "./friendsApi";
import * as messagesApi from "./messagesApi";
import { connectSocket, getSocket } from "./socket";

import type { ChatMessage, ConversationV2 } from '../types/chat';

type Message = any;

// Mapper function to convert API message format to UI format
function mapApiMessageToUIMessage(apiMessage: any): ChatMessage {
  return {
    id: apiMessage.id,
    conversationId: apiMessage.conversationId,
    fromMe: apiMessage.senderId === 'user-me' || (apiMessage.sender && apiMessage.sender.me === true),
    senderId: apiMessage.senderId || (apiMessage.sender ? 'user-me' : undefined),
    type: apiMessage.type || 'text',
    text: apiMessage.text || apiMessage.content || '',
    timestamp: apiMessage.timestamp || apiMessage.createdAt || Date.now(),
    fileInfo: apiMessage.fileInfo || (apiMessage.attachments && apiMessage.attachments.length > 0 && apiMessage.attachments[0] ? {
      uri: apiMessage.attachments[0]?.url || '',
      name: apiMessage.attachments[0]?.name || 'File',
      size: apiMessage.attachments[0]?.size || '0 MB',
      mimeType: apiMessage.attachments[0]?.mimeType || ''
    } : undefined),
    replyTo: apiMessage.replyTo,
    reactions: apiMessage.reactions,
    deletedFor: apiMessage.deletedFor,
    isRevoked: apiMessage.revoked || apiMessage.isRevoked
  };
}

const openConversations = new Set<string>();
const pendingAcks = new Map<
  string,
  { resolve: (msg: any) => void; reject: (err: any) => void }
>();

let socketInstance: Socket | null = null;
let listenersRegistered = false;

function generateUUID(): string {
  try {
    // Prefer native if available
    if (typeof globalThis?.crypto?.randomUUID === "function")
      return (globalThis.crypto as any).randomUUID();
  } catch (e) {
    // fallthrough
  }
  // fallback v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function ensureSocket() {
  if (!socketInstance) {
    socketInstance = await connectSocket();
  }
  if (!listenersRegistered) registerSocketListeners();
  return socketInstance;
}

export async function loadInitialMessages(conversationId: string) {
  // First page (limit 50)
  const resp = await messagesApi.getMessages(conversationId, 50);
  const payload = resp?.data || {};
  
  // Convert messages to UI format - handle different response structures
  let messages: any[] = [];
  if (Array.isArray(payload.messages)) {
    messages = payload.messages;
  } else if (Array.isArray(payload.data)) {
    messages = payload.data;
  } else if (Array.isArray(payload)) {
    messages = payload;
  }
  
  const uiMessages = messages.map(mapApiMessageToUIMessage);

  // Mark room open and join after loaded
  openConversations.add(conversationId);
  const s = await ensureSocket();
  try {
    s.emit("chat:join", { conversation_id: conversationId });
  } catch (e) {
    console.warn("chat:join emit failed", e);
  }

  return { messages: uiMessages, nextCursor: payload.nextCursor }; // caller expects { messages: [], nextCursor }
}

export async function fetchMoreMessages(
  conversationId: string,
  cursor?: string,
  limit = 50,
) {
  const resp = await messagesApi.getMessages(conversationId, limit, cursor);
  const payload = resp?.data || {};
  
  // Convert messages to UI format - handle different response structures
  let messages: any[] = [];
  if (Array.isArray(payload.messages)) {
    messages = payload.messages;
  } else if (Array.isArray(payload.data)) {
    messages = payload.data;
  } else if (Array.isArray(payload)) {
    messages = payload;
  }
  
  const uiMessages = messages.map(mapApiMessageToUIMessage);
  return { messages: uiMessages, nextCursor: payload.nextCursor };
}

export async function sendMessage(
  conversationId: string,
  content: any,
  files?: Array<any>,
) {
  const socket = await ensureSocket();

  // Handle attachments: upload first to get keys
  let attachments: any[] = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const fd = new FormData();
      // 'file' expects { uri, name, type } on React Native
      fd.append("file", file as any);
      const uploadResp = await messagesApi.uploadMedia(fd);
      const key = uploadResp?.data?.key || uploadResp?.data?.fileKey || null;
      if (key) attachments.push({ key, meta: uploadResp?.data });
    }
  }

  const localId = generateUUID();
  const optimisticMessage: Message = {
    id: localId,
    conversationId,
    content: content || (files && files.length > 0 ? files[0].name : ''),
    attachments,
    createdAt: Date.now(),
    sender: { me: true },
    status: "sending",
  };

  // Convert to UI format for optimistic update
  const uiOptimisticMessage = mapApiMessageToUIMessage(optimisticMessage);

  // Emit chat:send with idempotency key message_id
  const payload = {
    conversation_id: conversationId,
    message_id: localId,
    content: content || (files && files.length > 0 ? files[0].name : ''),
    attachments: attachments.map((a) => a.key),
    meta: {},
  };

  const sendPromise = new Promise<any>((resolve, reject) => {
    pendingAcks.set(localId, { resolve, reject });
    try {
      socket.emit("chat:send", payload, (ack: any) => {
        // some servers provide immediate callback; still rely on chat:ack event
        // resolve here if ack provided
        if (ack && ack.status === "ok") {
          const p = pendingAcks.get(localId);
          p?.resolve(ack);
          pendingAcks.delete(localId);
        }
      });
    } catch (e) {
      pendingAcks.delete(localId);
      reject(e);
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
  // Attach to module-level callbacks
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
    console.log("chatService socket connect");
    // Re-emit chat:join for all open conversations
    for (const conv of Array.from(openConversations)) {
      try {
        s.emit("chat:join", { conversation_id: conv });
      } catch (e) {
        console.warn("Re-emit chat:join failed", e);
      }
    }
  });

  s.on("chat:ack", (payload: any) => {
    // payload expected to contain message_id (client local id) and serverId/createdAt
    const clientId = payload?.message_id;
    if (clientId) {
      const p = pendingAcks.get(clientId);
      if (p) {
        p.resolve(payload);
        pendingAcks.delete(clientId);
      }
    }
  });

  s.on("chat:message", async (payload: any) => {
    // Append to message list. Server event doesn't include attachments per spec
    const conversationId = payload?.conversation_id || payload?.conversationId;
    const messageId = payload?.id || payload?.message_id;
    const createdAt = payload?.createdAt || payload?.ts || payload?.timestamp;

    // Fetch full details (attachments) as required
    try {
      const detailsResp = await messagesApi.getMessageDetails(
        conversationId,
        createdAt,
        messageId,
      );
      const fullMessage = detailsResp?.data || payload;
      const uiMessage = mapApiMessageToUIMessage(fullMessage);
      _handlers.onMessage?.(uiMessage);
    } catch (e) {
      console.warn(
        "Failed to fetch message details, falling back to event payload",
        e,
      );
      const uiMessage = mapApiMessageToUIMessage(payload);
      _handlers.onMessage?.(uiMessage);
    }
  });

  s.on("chat:message:updated", (payload: any) => {
    const uiMessage = mapApiMessageToUIMessage(payload);
    _handlers.onMessageUpdated?.(uiMessage);
  });

  s.on("chat:message:deleted", (payload: any) => {
    _handlers.onMessageDeleted?.(payload);
  });

  s.on("chat:reaction:added", (payload: any) => {
    _handlers.onReactionAdded?.(payload);
  });

  s.on("chat:reaction:removed", (payload: any) => {
    _handlers.onReactionRemoved?.(payload);
  });

  listenersRegistered = true;
}

export async function leaveConversation(conversationId: string) {
  return conversationsApi.leaveConversation(conversationId);
}


export default {
  loadInitialMessages,
  fetchMoreMessages,
  sendMessage,
  registerHandlers,
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

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.conversations)) {
      return payload.conversations;
    }

    console.warn("Unexpected conversations response format:", payload);
    return [];
  } catch (e) {
    console.warn("fetchConversations failed", e);
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

    console.warn("Unexpected messages response format:", payload);
    return [];
  } catch (e) {
    console.warn("fetchMessages failed", e);
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
      convResp?.data?.data ||
      convResp?.data?.conversations ||
      [];

    const result: Record<string, ChatMessage[]> = {};

    await Promise.all(
      convs.map(async (c: any) => {
        try {
          const msgResp = await messagesApi.getMessages(
            c.conversationId,
            50
          );

          const payload = msgResp?.data;

          if (Array.isArray(payload?.data)) {
            result[c.conversationId] = payload.data;
          } else if (Array.isArray(payload?.messages)) {
            result[c.conversationId] = payload.messages;
          } else {
            console.warn("Invalid messages format:", payload);
            result[c.conversationId] = [];
          }
        } catch (e) {
          result[c.conversationId] = [];
        }
      })
    );

    return result;
  } catch (e) {
    console.warn("fetchAllMessages failed", e);
    return {};
  }
}

/**
 * GET /api/contacts
 * Trả về danh sách bạn bè / users.
 */
export async function fetchContacts(): Promise<{ users: ContactUser[] }> {
  try {
    const resp = await friendsApi.getFriends({ page: 1, limit: 100 });
    const payload = resp?.data;

    let list: any[] = [];

    if (Array.isArray(payload?.data)) {
      list = payload.data;
    } else if (Array.isArray(payload?.friends)) {
      list = payload.friends;
    } else {
      console.warn("Invalid friends response:", payload);
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
    console.warn("fetchContacts failed", e);
    return { users: [] };
  }
}
import type { ChatMessage } from "../types/chat";
import * as conversationsApi from "./conversationsApi";
import * as messagesApi from "./messagesApi";
import { buildAttachmentDto, uploadMedia } from "./mediaService";
import { getCurrentUser } from "./authService";
import { createSocket, getSocket } from "./socket";
import { getDeduplicationService } from "./deduplicationService";
import { generateUUID } from "../utils/uuid";
import { toLegacyChatMessage, enrichReplyToDetails } from "./chatUtils";

// Deduplication service
const dedupService = getDeduplicationService();

// Track open conversations
const openConversations = new Set<string>();

// Map of pending ACK callbacks
const pendingAcks = new Map<
  string,
  { resolve: (msg: any) => void; reject: (err: any) => void }
>();

// Type for outgoing file attachments
type OutgoingFile = {
  uri?: string;
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number;
};

type NormalizedOutgoingFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

// Normalize outgoing file
const normalizeOutgoingFile = (file: OutgoingFile): NormalizedOutgoingFile => ({
  uri: file.uri || "",
  name: file.name || "File",
  type: file.mimeType || file.type || "application/octet-stream",
  size: file.size || 0,
});

/**
 * Send a message via socket
 * Supports text, attachments, replyTo, and forwardedFrom
 */
export async function sendSocketMessage(
  conversationId: string,
  content: string,
  files: OutgoingFile[] | null,
  options?: {
    replyToMessage?: ChatMessage;
    forwardedFrom?: ChatMessage["forwardedFrom"];
  }
): Promise<{ optimisticMessage: ChatMessage; sendPromise: Promise<any> }> {
  const socket = await createSocket();

  let attachments: any[] = [];
  if (files && files.length > 0) {
    let currentUserId = "";
    try {
      const user = await getCurrentUser();
      currentUserId = user?.id || (user as any)?.userId || (user as any)?._id || "";
    } catch (e) {
      // Silent fail
    }

    for (const rawFile of files as OutgoingFile[]) {
      const file = normalizeOutgoingFile(rawFile);
      if (!file.uri) continue;

      const uploadResult = await uploadMedia(
        {
          uri: file.uri,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        } as any,
        currentUserId,
        conversationId
      );

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
    options?.replyToMessage?.id ||
    ""
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
          id: (replyToMessageId || options.replyToMessage.id || "") as string,
          senderId: options.replyToMessage.senderId || "",
          text: options.replyToMessage.text || "",
        }
      : undefined,
    forwardedFrom: options?.forwardedFrom,
    status: "sending" as const,
  };

  const uiOptimisticMessage = toLegacyChatMessage(optimisticMessage);

  const payload = {
    conversation_id: conversationId,
    message_id: localId,
    body: content || (files && files.length > 0 ? files[0].name : ""),
    sent_at: Date.now(),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    ...(options?.forwardedFrom ? { forwarded_from: options.forwardedFrom } : {}),
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

/**
 * Edit a message via socket
 */
export async function editMessage(
  conversationId: string,
  messageId: string,
  newBody: string,
  createdAt: number
): Promise<void> {
  const socket = await createSocket();
  socket.emit("chat:edit", {
    message_id: messageId,
    conversation_id: conversationId,
    new_body: newBody,
    created_at: createdAt,
  });
}

/**
 * Delete a message via socket
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  createdAt: number
): Promise<void> {
  const socket = await createSocket();
  socket.emit("chat:delete", {
    message_id: messageId,
    conversation_id: conversationId,
    created_at: createdAt,
  });
}

/**
 * Add reaction to a message
 */
export async function reactMessage(
  conversationId: string,
  messageId: string,
  reactionType: "like" | "love" | "haha" | "wow" | "sad" | "angry"
): Promise<void> {
  const socket = await createSocket();
  socket.emit("chat:react", {
    message_id: messageId,
    conversation_id: conversationId,
    reaction_type: reactionType,
  });
}

/**
 * Remove reaction from a message
 */
export async function unreactMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  const socket = await createSocket();
  socket.emit("chat:unreact", {
    message_id: messageId,
    conversation_id: conversationId,
  });
}

/**
 * Forward a message to one or more conversations
 */
let forwardCallCount = 0;

export async function forwardMessage(
  originalMessage: any,
  targetConversationIds: string | string[]
): Promise<any> {
  forwardCallCount++;
  const targets = Array.isArray(targetConversationIds)
    ? targetConversationIds
    : [targetConversationIds];

  const forwardId = generateUUID();
  const sourceMessageId =
    originalMessage.serverMessageId || originalMessage.id;

  if (!sourceMessageId) {
    throw new Error("Source message ID is required for forwarding");
  }

  // Try to fetch message details first to verify it exists
  if (originalMessage.conversationId && originalMessage.timestamp) {
    try {
      await messagesApi.getMessageDetails(
        originalMessage.conversationId,
        originalMessage.timestamp,
        sourceMessageId
      );
    } catch (error) {
      throw new Error("SOURCE_NOT_FOUND");
    }
  }

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

/**
 * Join a conversation room via socket
 */
export async function joinConversation(conversationId: string): Promise<void> {
  const socket = await createSocket();
  openConversations.add(conversationId);

  socket.emit("chat:join", {
    conversation_id: conversationId,
  });
}

/**
 * Leave a conversation room via socket
 */
export async function leaveChatConversation(conversationId: string): Promise<any> {
  openConversations.delete(conversationId);
  return conversationsApi.leaveConversation(conversationId);
}

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

/**
 * Get message reactions
 */
export async function getMessageReactions(
  messageId: string
): Promise<any | null> {
  try {
    const response = await messagesApi.getMessageReactions(messageId);
    return response?.data;
  } catch (error) {
    return null;
  }
}

// Re-export for backward compatibility
export { pendingAcks, openConversations, generateUUID };

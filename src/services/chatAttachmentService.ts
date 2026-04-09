/**
 * chatAttachmentService.ts
 *
 * Orchestrates file upload + WebSocket chat:send for messages with attachments.
 * Handles chat:ack rejection reasons (attachment_not_found, etc.).
 */

import type { Socket } from 'socket.io-client';
import type {
  AttachmentDto,
  ChatAckPayload,
  ChatSendPayload,
  MediaFileInput,
} from '../types/media';
import {
  buildAttachmentDto,
  getAttachmentType,
  uploadMedia,
} from './mediaService';

// ─── UUID helper ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  try {
    if (typeof globalThis?.crypto?.randomUUID === 'function') {
      return (globalThis.crypto as any).randomUUID();
    }
  } catch {
    // fallthrough
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Ack timeout (ms) ────────────────────────────────────────────────────────

const ACK_TIMEOUT_MS = 15_000;

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SendWithAttachmentsOptions {
  /** Socket.IO instance (already connected) */
  socket: Socket;
  /** Target conversation */
  conversationId: string;
  /** Text body of the message (can be empty) */
  body: string;
  /** Files picked from device */
  files: MediaFileInput[];
  /** Current user ID (used for x-user-id header in media APIs) */
  userId: string;
  /** Optional client-generated message ID (will generate one if omitted) */
  messageId?: string;
}

export interface SendWithAttachmentsResult {
  /** The message_id sent to the server */
  messageId: string;
  /** The built attachment DTOs */
  attachments: AttachmentDto[];
  /** Promise that resolves with the chat:ack payload or rejects on error/timeout */
  ackPromise: Promise<ChatAckPayload>;
}

/**
 * Upload files via 3-step presigned flow, then emit `chat:send` with attachments.
 *
 * Returns immediately with the messageId and a promise for the chat:ack.
 *
 * @example
 * ```ts
 * const { messageId, ackPromise } = await sendMessageWithAttachments({
 *   socket, conversationId, body: 'Check this out!', files, userId,
 * });
 * try {
 *   const ack = await ackPromise;
 *   console.log('Message accepted:', ack);
 * } catch (err) {
 *   console.error('Message rejected:', err);
 * }
 * ```
 */
export async function sendMessageWithAttachments(
  options: SendWithAttachmentsOptions,
): Promise<SendWithAttachmentsResult> {
  const {
    socket,
    conversationId,
    body,
    files,
    userId,
    messageId: explicitId,
  } = options;

  const messageId = explicitId || generateUUID();

  // ── Step 1: Upload all files in parallel ───────────────────────────────
  const uploadResults = await Promise.all(
    files.map((file) => uploadMedia(file, userId, conversationId)),
  );

  // ── Step 2: Build attachment DTOs ──────────────────────────────────────
  const attachments: AttachmentDto[] = uploadResults.map(buildAttachmentDto);

  // ── Step 3: Build chat:send payload ────────────────────────────────────
  const payload: ChatSendPayload = {
    message_id: messageId,
    conversation_id: conversationId,
    body: body || files[0]?.name || '',
    sent_at: Date.now(),
    attachments,
  };

  // ── Step 4: Emit + wait for ack ────────────────────────────────────────
  const ackPromise = new Promise<ChatAckPayload>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`chat:ack timeout after ${ACK_TIMEOUT_MS}ms for message ${messageId}`));
    }, ACK_TIMEOUT_MS);

    const onAck = (ack: ChatAckPayload) => {
      if (ack.message_id !== messageId) return; // not our ack

      cleanup();

      if (ack.status === 'rejected') {
        const reason = ack.reason || 'unknown';
        reject(new Error(`Message rejected: ${reason}`));
        return;
      }

      resolve(ack);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('chat:ack', onAck);
    };

    socket.on('chat:ack', onAck);

    try {
      socket.emit('chat:send', payload, (callbackAck: any) => {
        // Some servers provide immediate callback ack
        if (!callbackAck) return;
        if (callbackAck.status === 'accepted') {
          cleanup();
          resolve(callbackAck);
        } else if (callbackAck.status === 'rejected') {
          cleanup();
          reject(new Error(`Message rejected: ${callbackAck.reason || 'unknown'}`));
        }
      });
    } catch (emitError) {
      cleanup();
      reject(emitError);
    }
  });

  return { messageId, attachments, ackPromise };
}

/**
 * Register a global listener for `chat:ack` rejection events.
 * Useful for showing toast/snackbar in UI.
 *
 * @returns Cleanup function to remove the listener.
 */
export function listenForAckErrors(
  socket: Socket,
  onError: (ack: ChatAckPayload) => void,
): () => void {
  const handler = (ack: ChatAckPayload) => {
    if (ack.status === 'rejected') {
      console.error(
        `[chatAttachment] Message ${ack.message_id} rejected: ${ack.reason}`,
      );
      onError(ack);
    }
  };

  socket.on('chat:ack', handler);

  return () => {
    socket.off('chat:ack', handler);
  };
}

// Re-export helper for convenience
export { getAttachmentType };

export default {
  sendMessageWithAttachments,
  listenForAckErrors,
  getAttachmentType,
};

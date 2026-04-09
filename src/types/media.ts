/**
 * media.ts
 *
 * Type definitions for the media upload / download / attachment system.
 * Used by mediaService, chatAttachmentService, and avatarService.
 */

// ─── Attachment Type ─────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'video' | 'audio' | 'document';

export type FileVisibility = 'public' | 'private';

// ─── Presign Upload ──────────────────────────────────────────────────────────

export interface PresignUploadRequest {
  contentType: string;
  fileName: string;
}

export interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  visibility: FileVisibility;
  expiresAt: string; // ISO-8601
}

// ─── Upload Confirm ──────────────────────────────────────────────────────────

export interface UploadConfirmRequest {
  key: string;
  contentType: string;
  conversationId?: string;
}

export interface UploadConfirmResponse {
  ok: boolean;
  thumbnailKey?: string; // Only returned for images
}

// ─── Presign Download ────────────────────────────────────────────────────────

export interface PresignDownloadRequest {
  key: string;
}

export interface PresignDownloadResponse {
  downloadUrl: string;
  expiresAt: number; // Epoch ms when URL expires (~15 min)
}

// ─── Combined Upload Result ──────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  visibility: FileVisibility;
  thumbnailKey?: string;
  contentType: string;
  fileName: string;
  fileSize: number;
}

// ─── Attachment DTO (payload for WebSocket chat:send — snake_case) ────────────

export interface AttachmentDto {
  key: string;
  type: AttachmentType;
  name: string;
  size: number;
  content_type: string;
  thumbnail_key?: string;
  visibility: FileVisibility;
}

// ─── REST Attachment DTO (from REST API responses — camelCase) ───────────────

export interface RestAttachmentDto {
  key: string;
  type: AttachmentType;
  name: string;
  size: number;
  contentType: string;          // camelCase in REST response
  thumbnailKey?: string;
  visibility: FileVisibility;
  url: string | null;           // CDN URL for public, null for private
  thumbnailUrl?: string;        // CDN URL for thumbnail
}

// ─── File input (from device picker) ─────────────────────────────────────────

export interface MediaFileInput {
  uri: string;
  name: string;
  mimeType: string; // e.g. 'image/jpeg'
  size: number;      // bytes
}

// ─── Chat Send Payload ───────────────────────────────────────────────────────

export interface ChatSendPayload {
  message_id: string;
  conversation_id: string;
  body: string;
  sent_at: number;
  attachments: AttachmentDto[];
}

// ─── Chat Ack Payload ────────────────────────────────────────────────────────

export type ChatAckStatus = 'accepted' | 'rejected';

export type ChatAckRejectReason =
  | 'not_member'
  | 'attachment_not_found'
  | 'attachment_not_owned'
  | 'attachment_not_ready'
  | string;

export interface ChatAckPayload {
  message_id: string;
  status: ChatAckStatus;
  reason?: ChatAckRejectReason;
}

// ─── Media Error ─────────────────────────────────────────────────────────────

export class MediaError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

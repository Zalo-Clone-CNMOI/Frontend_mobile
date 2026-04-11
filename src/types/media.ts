/**
 * media.ts
 *
 * Type definitions for the media upload / download / attachment system.
 * Used by mediaService, chatAttachmentService, and avatarService.
 */


export type AttachmentType = 'image' | 'video' | 'audio' | 'document';

export type FileVisibility = 'public' | 'private';


export interface PresignUploadRequest {
  contentType: string;
  fileName: string;
}

export interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  visibility: FileVisibility;
  expiresAt: string;
}


export interface UploadConfirmRequest {
  key: string;
  contentType: string;
  conversationId?: string;
}

export interface UploadConfirmResponse {
  ok: boolean;
  thumbnailKey?: string;
}


export interface PresignDownloadRequest {
  key: string;
}

export interface PresignDownloadResponse {
  downloadUrl: string;
  expiresAt: number;
}


export interface UploadResult {
  key: string;
  visibility: FileVisibility;
  thumbnailKey?: string;
  contentType: string;
  fileName: string;
  fileSize: number;
}


export interface AttachmentDto {
  key: string;
  type: AttachmentType;
  name: string;
  size: number;
  content_type: string;
  thumbnail_key?: string;
  visibility: FileVisibility;
}


export interface RestAttachmentDto {
  key: string;
  type: AttachmentType;
  name: string;
  size: number;
  contentType: string;         
  thumbnailKey?: string;
  visibility: FileVisibility;
  url: string | null;          
  thumbnailUrl?: string;       
}


export interface MediaFileInput {
  uri: string;
  name: string;
  mimeType: string;
  size: number;     
}


export interface ChatSendPayload {
  message_id: string;
  conversation_id: string;
  body: string;
  sent_at: number;
  attachments: AttachmentDto[];
}


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


export class MediaError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

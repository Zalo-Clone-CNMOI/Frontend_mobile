/**
 * mediaService.ts
 *
 * Core media upload / download service.
 * Files are uploaded DIRECTLY to S3 via presigned URLs (never through backend).
 *
 * Upload flow (3 steps):
 *   1. Presign  → POST /api/media/presign/upload
 *   2. Upload   → PUT binary to S3 uploadUrl
 *   3. Confirm  → POST /api/media/upload/confirm
 *
 * Download:
 *   - Public files  → CDN URL directly
 *   - Private files → POST /api/media/presign/download → signed GET URL
 */

import { NETWORK_CONFIG } from '../config/network';
import type {
  AttachmentDto,
  AttachmentType,
  FileVisibility,
  MediaFileInput,
  PresignDownloadResponse,
  PresignUploadResponse,
  UploadConfirmResponse,
  UploadResult,
} from '../types/media';
import { MediaError } from '../types/media';
import { getCurrentToken } from './authService';

const MEDIA_URL = NETWORK_CONFIG.MEDIA_BASE_URL;

/** Fetch with timeout to prevent hanging */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new MediaError(0, `Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


/**
 * Maps a MIME type string to the canonical AttachmentType.
 *
 * - image/*  → 'image'  (public)
 * - video/*  → 'video'  (public)
 * - audio/*  → 'audio'  (private)
 * - anything else → 'document' (private)
 */
export function getAttachmentType(mimeType?: string): AttachmentType {
  if (!mimeType) return 'document';
  const lower = mimeType.toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('video/')) return 'video';
  if (lower.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * Determine the visibility for a given attachment type.
 * Image/Video = public (CDN). Audio/Document = private (presigned).
 */
export function getVisibility(type: AttachmentType): FileVisibility {
  return type === 'image' || type === 'video' ? 'public' : 'private';
}


async function presignUpload(
  fileName: string,
  contentType: string,
  userId: string,
  retryCount = 0,
): Promise<PresignUploadResponse> {
  const url = `${MEDIA_URL}/api/media/presign/upload`;
  

  const token = await getCurrentToken();
  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType, fileName }),
    }, 1000);

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 400) {
        throw new MediaError(400, `Presign failed: missing contentType or invalid request. ${text}`);
      }
      if (response.status === 401) {
        throw new MediaError(401, `Presign failed: missing x-user-id header. ${text}`);
      }
      throw new MediaError(response.status, `Presign upload failed (${response.status}): ${text}`);
    }

    const json = await response.json();
    const data = json?.data ?? json;

    return {
      key: data.key,
      uploadUrl: data.uploadUrl,
      visibility: data.visibility,
      expiresAt: data.expiresAt,
    };
  } catch (err: any) {
    if (retryCount < 2 && (err?.message?.includes('timed out') || err?.name === 'AbortError' || err?.message?.includes('Network'))) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return presignUpload(fileName, contentType, userId, retryCount + 1);
    }
    throw err;
  }
}


async function uploadToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: await uriToBlob(fileUri),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new MediaError(response.status, `S3 upload failed (${response.status}): ${text}`);
  }
}

/**
 * Convert a local file URI to a Blob for upload.
 * Works on both React Native and Web.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const resp = await fetch(uri);
  return resp.blob();
}


async function confirmUpload(
  key: string,
  contentType: string,
  userId: string,
  conversationId?: string,
): Promise<UploadConfirmResponse> {
  const url = `${MEDIA_URL}/api/media/upload/confirm`;

  const body: Record<string, string> = { key, contentType };
  if (conversationId) {
    body.conversationId = conversationId;
  }
  const token = await getCurrentToken();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 400) {
      throw new MediaError(400, `Confirm failed: file may not be fully uploaded on S3. ${text}`);
    }
    if (response.status === 401) {
      throw new MediaError(401, `Confirm failed: missing x-user-id header. ${text}`);
    }
    throw new MediaError(response.status, `Upload confirm failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const data = json?.data ?? json;

  return {
    ok: Boolean(data.ok ?? true),
    thumbnailKey: data.thumbnailKey,
  };
}


/**
 * Full 3-step upload flow:
 * 1. Presign → get S3 upload URL + key
 * 2. PUT binary to S3
 * 3. Confirm → backend validates & generates thumbnail
 *
 * @param file           File picked from device (uri, name, mimeType, size)
 * @param userId         Current user's ID (sent as x-user-id header)
 * @param conversationId Optional conversation context (for chat attachments)
 * @returns              UploadResult with key, visibility, thumbnailKey, etc.
 */
export async function uploadMedia(
  file: MediaFileInput,
  userId: string,
  conversationId?: string,
): Promise<UploadResult> {
  try {
    const presign = await presignUpload(file.name, file.mimeType, userId);

    await uploadToS3(presign.uploadUrl, file.uri, file.mimeType);

    const confirm = await confirmUpload(
      presign.key,
      file.mimeType,
      userId,
      conversationId,
    );

    return {
      key: presign.key,
      visibility: presign.visibility,
      thumbnailKey: confirm.thumbnailKey,
      contentType: file.mimeType,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch (error) {
    if (error instanceof MediaError) {
      throw error;
    }
    throw new MediaError(0, `Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Convert an UploadResult into an AttachmentDto ready for chat:send payload.
 */
export function buildAttachmentDto(result: UploadResult): AttachmentDto {
  return {
    key: result.key,
    type: getAttachmentType(result.contentType),
    name: result.fileName,
    size: result.fileSize,
    content_type: result.contentType,
    thumbnail_key: result.thumbnailKey,
    visibility: result.visibility,
  };
}


/**
 * Get a displayable URL for an attachment.
 *
 * - If the attachment already has a `url` (from REST API response), returns it directly.
 * - Public files (image/video): returns the CDN URL.
 * - Private files (audio/document): calls presign/download to get a signed URL.
 *
 * @param attachment  Attachment object (WS or REST format)
 * @param userId      Current user's ID
 * @param cdnBaseUrl  Optional CDN base URL override
 */
export async function getAttachmentUrl(
  attachment: Pick<AttachmentDto, 'key' | 'visibility'> & { url?: string | null },
  userId: string,
  cdnBaseUrl?: string,
): Promise<string> {
  try {
    if (attachment.visibility === 'public' && attachment.url) {
      return attachment.url;
    }
    return await presignDownload(attachment.key, userId);
  } catch (error) {
    if (error instanceof MediaError) {
      throw error;
    }
    throw new MediaError(0, `Get attachment URL failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}


async function presignDownload(
  key: string,
  userId: string,
): Promise<string> {
  const url = `${MEDIA_URL}/api/media/presign/download`;

  const token = await getCurrentToken();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 403) {
      throw new MediaError(403, `Download forbidden: no permission to access this private file. ${text}`);
    }
    if (response.status === 401) {
      throw new MediaError(401, `Download failed: missing x-user-id header. ${text}`);
    }
    throw new MediaError(response.status, `Presign download failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const data: PresignDownloadResponse = json?.data ?? json;
  return data.downloadUrl;
}

export default {
  uploadMedia,
  getAttachmentUrl,
  getAttachmentType,
  getVisibility,
  buildAttachmentDto,
};

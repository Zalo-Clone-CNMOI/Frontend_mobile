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
const MEDIA_FILE_BASE_URL = NETWORK_CONFIG.MEDIA_FILE_BASE_URL;
const S3_BUCKET = NETWORK_CONFIG.S3_BUCKET;
const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com';



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



/**

 * Resolve a media URL from a key or full URL.
 * If the key starts with 'http', return it directly.
 * Otherwise, build CDN URL matching Backend pattern: {base}/{bucket}/{key}
 *
 * @param key - Media key or full URL
 * @returns Resolved URL
 */

export function resolveMediaUrl(key: string): string {

  if (key.startsWith('http')) {

    return key;

  }

  // Extract bucket name from key if it's in format "bucket/key"
  // Otherwise use default bucket from config
  const parts = key.split('/');
  const keyPath = parts.length > 1 && parts[0].includes('-') ? key : `${S3_BUCKET}/${key}`;

  // Use direct S3 URL for public files instead of backend proxy
  return `${S3_BASE_URL}/${keyPath}`;

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
        'x-user-id': userId,
      },
      body: JSON.stringify({ contentType, fileName }),
    }, 1000);

    if (!response.ok) {

      const text = await response.text();

      console.error('[presignUpload] Error response:', text);

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

  } catch (error) {

    console.error('[presignUpload] Error:', error);

    if (error instanceof MediaError) {

      throw error;

    }

    throw new MediaError(0, `Presign network failed: ${error instanceof Error ? error.message : String(error)}`);

  }

}





async function uploadToS3(

  uploadUrl: string,

  fileUri: string,

  contentType: string,

): Promise<void> {

  try {

    const response = await fetch(uploadUrl, {

      method: 'PUT',

      headers: {

        'Content-Type': contentType,

      },

      body: await uriToBlob(fileUri),

    });

    if (!response.ok) {

      const text = await response.text();

      console.error('[uploadToS3] Error response:', text);

      throw new MediaError(response.status, `S3 upload failed (${response.status}): ${text}`);

    }

  } catch (error) {

    console.error('[uploadToS3] Error:', error);

    if (error instanceof MediaError) {

      throw error;

    }

    throw new MediaError(0, `S3 network failed: ${error instanceof Error ? error.message : String(error)}`);

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

    console.error('[mediaService] Upload failed:', error);

    if (error instanceof MediaError) {

      console.error('[mediaService] MediaError:', error.status, error.message);

      throw error;

    }

    console.error('[mediaService] Generic error:', error instanceof Error ? error.message : String(error));

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

 * - Public files (image/video): returns the CDN URL built from key.

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

    // If URL is already provided by Backend (REST API response), use it

    if (attachment.url) {

      return attachment.url;

    }

    // For public files, build CDN URL from key

    if (attachment.visibility === 'public') {

      return resolveMediaUrl(attachment.key);

    }

    // For private files, get presigned download URL

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

  resolveMediaUrl,

  buildAttachmentDto,

};


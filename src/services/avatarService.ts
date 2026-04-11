/**
 * avatarService.ts
 *
 * Avatar upload flow:
 *   1-3. Reuses the 3-step presigned upload from mediaService
 *   4.   Updates the user profile on SSO service with the new avatar key
 */

import { NETWORK_CONFIG } from '../config/network';
import type { MediaFileInput, UploadResult } from '../types/media';
import { MediaError } from '../types/media';
import { uploadMedia } from './mediaService';

const SSO_URL = NETWORK_CONFIG.SSO_BASE_URL;


export interface UploadAvatarResult extends UploadResult {
  /** Whether the SSO profile update succeeded */
  profileUpdated: boolean;
}

/**
 * Upload an avatar image via the 3-step presigned flow, then update the
 * user's profile on the SSO service.
 *
 * @param file    Image file from device picker
 * @param userId  Current user ID (for x-user-id in media APIs)
 * @param token   JWT access token (for Authorization: Bearer in SSO API)
 * @returns       UploadAvatarResult
 *
 * @example
 * ```ts
 * const result = await uploadAvatar(imageFile, userId, accessToken);
 * console.log('Avatar key:', result.key);
 * console.log('Profile updated:', result.profileUpdated);
 * ```
 */
export async function uploadAvatar(
  file: MediaFileInput,
  userId: string,
  token: string,
): Promise<UploadAvatarResult> {
  try {
    const uploadResult = await uploadMedia(file, userId);

    const profileUpdated = await updateSsoAvatar(uploadResult.key, token);

    return {
      ...uploadResult,
      profileUpdated,
    };
  } catch (error) {
    if (error instanceof MediaError) {
      throw error;
    }
    throw new MediaError(
      0,
      `Avatar upload failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}


/**
 * PUT to SSO service to update the user's avatar URL.
 *
 * Endpoint: PUT http://<host>:5001/api/users/profile
 * Headers:  Authorization: Bearer <token>
 * Body:     { avatarUrl: "<s3 key>" }
 */
async function updateSsoAvatar(
  avatarKey: string,
  token: string,
): Promise<boolean> {
  const url = `${SSO_URL}/api/users/profile`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ avatarUrl: avatarKey }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 400) {
      throw new MediaError(400, `SSO profile update failed: MEDIA_PERMISSION_DENIED — avatar key invalid. ${text}`);
    }
    if (response.status === 401) {
      throw new MediaError(401, `SSO profile update failed: unauthorized. ${text}`);
    }
    throw new MediaError(
      response.status,
      `SSO profile update failed (${response.status}): ${text}`,
    );
  }

  return true;
}

export default {
  uploadAvatar,
};

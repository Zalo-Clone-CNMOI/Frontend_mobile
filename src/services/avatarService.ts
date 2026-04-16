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



export interface ValidationResult {

  valid: boolean;

  error?: string;

}



/**

 * Validate avatar file before upload.

 *

 * - Check file size (< 5MB)

 * - Check content type (images only: JPEG, PNG, WebP)

 */

function validateAvatarFile(file: MediaFileInput): ValidationResult {

  // Check file size (< 5MB)

  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSize) {

    return { valid: false, error: 'File quá lớn (tối đa 5MB)' };

  }



  // Check content type (images only)

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!file.mimeType || !validTypes.includes(file.mimeType)) {

    return { valid: false, error: 'Chỉ chấp nhận file ảnh (JPEG, PNG, WebP)' };

  }



  return { valid: true };

}



export interface UploadAvatarResult extends UploadResult {

  // Kept for compatibility, but profile update is handled by caller

  profileUpdated?: boolean;

}



/**

 * Upload an avatar image via the 3-step presigned flow.

 * Profile update is handled separately by the caller (like web).

 *

 *

 * @param file    Image file from device picker

 * @param userId  Current user ID (for x-user-id in media APIs)

 * @returns       UploadAvatarResult

 *

 * @example

 * ```ts

 * const result = await uploadAvatar(imageFile, userId);


 * // Then call updateProfile with the key

 * ```

 *

 */

export async function uploadAvatar(

  file: MediaFileInput,

  userId: string,

): Promise<UploadAvatarResult> {




  // Validate file before upload

  const validation = validateAvatarFile(file);

  if (!validation.valid) {

    console.error('[avatarService] Validation failed:', validation.error);

    throw new MediaError(400, validation.error || 'Invalid avatar file');
  }

  try {
    const uploadResult = await uploadMedia(file, userId);

    return uploadResult;
  } catch (error) {

    console.error('[avatarService] Upload failed:', error);

    if (error instanceof MediaError) {

      console.error('[avatarService] MediaError:', error.status, error.message);

      throw error;

    }

    console.error('[avatarService] Generic error:', error instanceof Error ? error.message : String(error));

    throw new MediaError(

      0,

      `Avatar upload failed: ${error instanceof Error ? error.message : String(error)}`,

    );

  }

}





/**

 * PATCH to SSO service to update the user's avatar URL.

 *

 * Endpoint: PATCH http://<host>:5001/users/me

 * Headers:  Authorization: Bearer <token>

 * Body:     { avatarUrl: "<s3 key>" }

 */

async function updateSsoAvatar(

  avatarKey: string,

  token: string,

): Promise<boolean> {

  const url = `${SSO_URL}/users/me`;




  const response = await fetch(url, {

    method: 'PATCH',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${token}`,

    },

    body: JSON.stringify({ avatarUrl: avatarKey }),

  });






  if (!response.ok) {

    let errorText = '';

    let errorData: any = null;



    try {

      errorText = await response.text();

      errorData = errorText ? JSON.parse(errorText) : null;

    } catch {

      errorData = null;

    }



    const message = errorData?.message || errorText || `SSO profile update failed`;

    console.error('[updateSsoAvatar] Error response:', { status: response.status, message, errorData });



    if (response.status === 400) {

      if (message.includes('MEDIA_PERMISSION_DENIED')) {

        throw new MediaError(400, `File không thuộc user. ${message}`);

      } else if (message.includes('Invalid avatar URL')) {

        throw new MediaError(400, `Invalid URL format. ${message}`);

      }

      throw new MediaError(400, `${message}`);

    }

    if (response.status === 401) {

      throw new MediaError(401, `Unauthorized. ${message}`);

    }

    if (response.status === 409) {

      throw new MediaError(409, `Email conflict (update cùng lúc). ${message}`);

    }

    throw new MediaError(

      response.status,

      `SSO profile update failed (${response.status}): ${message}`,

    );

  }




  return true;

}



export default {

  uploadAvatar,

  validateAvatarFile,

};

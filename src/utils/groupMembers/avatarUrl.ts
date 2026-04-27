import { NETWORK_CONFIG } from '@/src/config/network';

const S3_BASE_URL = NETWORK_CONFIG.S3_BASE_URL;

export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  if (!avatarUrl) return 'https://i.pravatar.cc/150?u=default';
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  return `${S3_BASE_URL}/${avatarUrl}`;
};

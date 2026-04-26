import { getUserProfile } from '@/src/services/usersApi';
import { NETWORK_CONFIG } from '@/src/config/network';
import { useCallback, useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  fullName?: string;
  nickname?: string;
  avatarUrl?: string;
}

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchUserProfile = useCallback(async (userId: string) => {
    // Skip invalid user IDs
    if (!userId || userId === 'user-me' || userId === 'undefined' || userId === 'null') {
      return null;
    }

    let shouldFetch = false;
    setLoading((prev) => {
      if (prev[userId]) {
        return prev;
      }
      shouldFetch = true;
      return { ...prev, [userId]: true };
    });

    if (!shouldFetch) return null;

    try {
      const data = await getUserProfile(userId);
      const profile: UserProfile = {
        id: userId,
        fullName: data?.fullName,
        nickname: data?.nickname,
        avatarUrl: data?.avatarUrl,
      };
      setProfiles((prev) => ({ ...prev, [userId]: profile }));
      return profile;
    } catch (error) {
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: false }));
    }
  }, []);

  const getAvatarUrl = useCallback((userId: string): string | null => {
    const profile = profiles[userId];
    if (!profile?.avatarUrl) return null;
    
    // Normalize with S3 prefix
    const S3_BASE_URL = NETWORK_CONFIG.S3_BASE_URL + '/';
    if (profile.avatarUrl.startsWith('http://') || profile.avatarUrl.startsWith('https://')) {
      // Replace bucket name if URL from backend uses wrong bucket
      const normalizedUrl = profile.avatarUrl.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
      return normalizedUrl;
    }
    const normalizedUrl = S3_BASE_URL + profile.avatarUrl.replace(/^\//, '');
    return normalizedUrl;
  }, [profiles]);

  return {
    profiles,
    fetchUserProfile,
    getAvatarUrl,
    loading,
  };
}
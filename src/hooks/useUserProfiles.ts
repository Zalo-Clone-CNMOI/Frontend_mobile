import { getUserProfile } from '@/src/services/usersApi';
import { useCallback, useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  fullName?: string;
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
    
    if (profiles[userId] || loading[userId]) return profiles[userId];

    setLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      const data = await getUserProfile(userId);
      const profile: UserProfile = {
        id: userId,
        fullName: data?.fullName,
        avatarUrl: data?.avatarUrl,
      };
      setProfiles((prev) => ({ ...prev, [userId]: profile }));
      return profile;
    } catch (error) {
      console.error(`Failed to fetch user profile for ${userId}:`, error);
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: false }));
    }
  }, [profiles, loading]);

  const getAvatarUrl = useCallback((userId: string): string | null => {
    const profile = profiles[userId];
    if (!profile?.avatarUrl) return null;
    
    // Normalize with S3 prefix
    const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/';
    if (profile.avatarUrl.startsWith('http://') || profile.avatarUrl.startsWith('https://')) {
      return profile.avatarUrl;
    }
    return S3_BASE_URL + profile.avatarUrl.replace(/^\//, '');
  }, [profiles]);

  return {
    profiles,
    fetchUserProfile,
    getAvatarUrl,
    loading,
  };
}

import { useState, useCallback } from 'react';
import { createDirect } from '@/src/services/conversationsApi';

export const useDirectChat = () => {
  const [isStarting, setIsStarting] = useState(false);

  const startChat = useCallback(async (userId: string, _fullName?: string) => {
    setIsStarting(true);
    try {
      const response = await createDirect(userId);
      return { success: true, data: response.data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to start chat' };
    } finally {
      setIsStarting(false);
    }
  }, []);

  return { startChat, isStarting };
};

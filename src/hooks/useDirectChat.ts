import { createDirect } from '@/src/services/conversationsApi';
import { extractConversationId } from '@/src/utils/conversation';
import { useRouter } from 'expo-router';
import { useState } from 'react';

interface StartChatResult {
  success: boolean;
  error?: string;
  conversationId?: string;
}

/**
 * Custom hook for starting direct conversations with users
 * Handles the flow: createDirect API → extract ID → navigate to chat
 */
export const useDirectChat = () => {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const startChat = async (userId: string, userName: string): Promise<StartChatResult> => {
    if (isStarting) {
      return { success: false, error: 'Đang xử lý' };
    }
    
    setIsStarting(true);
    
    try {
      const response = await createDirect(userId);
      const conversationId = extractConversationId(response);
      
      if (conversationId) {
        router.push({ 
          pathname: '/chat/[id]', 
          params: { id: String(conversationId), name: userName } 
        });
        return { success: true, conversationId };
      }
      
      return { success: false, error: 'Không thể tạo cuộc trò chuyện' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Không thể bắt đầu cuộc trò chuyện' };
    } finally {
      setIsStarting(false);
    }
  };

  return { startChat, isStarting };
};

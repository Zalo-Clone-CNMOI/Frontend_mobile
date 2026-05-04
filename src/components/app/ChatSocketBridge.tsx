import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initChat } from '../../services/chatService';
import { fetchRuntimeFriendSnapshot } from '../../services/realtime/runtimeFriendService';
import { useRealtimeStore } from '../../store/useRealtimeStore';
import { useChatsStore } from '../../store/useChatsStore';
import { getSocket } from '../../services/socket';
import { usePollSocket } from '../../hooks/usePollSocket';

/**
 * ChatSocketBridge - Component to initialize chat and poll socket listeners
 * This component calls initChat function to register socket event listeners
 * for chat messages, reactions, presence, etc.
 * It also initializes usePollSocket to automatically refresh UI when poll events are received.
 * It should be placed in the app layout to ensure socket listeners are registered
 * when the user is authenticated.
 *
 * NOTE: This replaces the useChatSocket hook pattern with the initChat function pattern
 * from Frontend_web to avoid duplicate listener registration.
 */
export function ChatSocketBridge() {
  const { isAuthenticated, user } = useAuth();
  
  // Initialize poll socket listeners to automatically refresh UI on poll events
  usePollSocket();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // Initialize chat socket listeners using initChat function
    // This registers all socket event listeners in chatService.ts
    initChat();

    // ✅ Auto-join all conversations to receive messages without opening them
    const joinAllConversations = async () => {
      try {
        // Wait for conversations to load
        await useChatsStore.getState().initializeChats();
        
        const conversations = useChatsStore.getState().chats;
        const socket = getSocket();
        
        // Limit to top 50 most recent conversations to avoid overload
        const MAX_AUTO_JOIN = 50;
        const conversationsToJoin = conversations.slice(0, MAX_AUTO_JOIN);
        
        if (socket && conversationsToJoin.length > 0) {
          console.log(`[ChatSocketBridge] Auto-joining ${conversationsToJoin.length}/${conversations.length} conversations (limited to ${MAX_AUTO_JOIN})`);
          
          // Join each conversation room
          conversationsToJoin.forEach((chat) => {
            if (chat.conversationId) {
              socket.emit('chat:join', { conversation_id: chat.conversationId });
            }
          });
          
          console.log('[ChatSocketBridge] Auto-join completed');
        }
      } catch (error) {
        console.error('[ChatSocketBridge] Failed to auto-join conversations:', error);
      }
    };

    // Delay auto-join to ensure socket is connected
    setTimeout(() => {
      joinAllConversations();
    }, 1000);

    // ✅ FIX 2: Hydrate realtime store khi app start (với retry logic)
    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000; // 2 seconds
    const retryCountRef = { current: 0 };

    const hydrateRealtimeStore = async () => {
      try {
        useRealtimeStore.getState().setHydrating(true);
        useRealtimeStore.getState().setHydrationError(null);

        const snapshot = await fetchRuntimeFriendSnapshot();
        useRealtimeStore.getState().setFriendSnapshot(snapshot);
        retryCountRef.current = 0; // Reset retry count on success
        console.log('[ChatSocketBridge] Realtime store hydrated successfully');
      } catch (error: any) {
        const isNetworkError = error?.message?.includes('Network Error') || error?.code === 'ECONNABORTED';
        const shouldRetry = retryCountRef.current < MAX_RETRIES && isNetworkError;

        console.error(`[ChatSocketBridge] Failed to hydrate realtime store (attempt ${retryCountRef.current + 1}/${MAX_RETRIES + 1}):`, error?.message || error);

        if (shouldRetry) {
          retryCountRef.current++;
          const delay = BASE_DELAY * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
          console.log(`[ChatSocketBridge] Retrying hydration in ${delay}ms...`);

          setTimeout(() => {
            hydrateRealtimeStore();
          }, delay);
        } else {
          // Max retries reached or non-network error - continue without data
          useRealtimeStore.getState().setHydrationError(error?.message || 'Failed to load friend data');
          console.warn('[ChatSocketBridge] Max retries reached or non-recoverable error. App will continue in offline mode.');
        }
      } finally {
        // Only set hydrating to false if we're not retrying
        if (retryCountRef.current >= MAX_RETRIES || !useRealtimeStore.getState().hydrationError) {
          useRealtimeStore.getState().setHydrating(false);
        }
      }
    };

    hydrateRealtimeStore();

    return () => {
      // Cleanup will be handled by initChat's internal logic on next init
    };
  }, [isAuthenticated, user?.id]);

  // This component doesn't render anything
  return null;
}

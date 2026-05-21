import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initChat } from '../../services/chatService';
import { initChat as initSocketHandlers } from '../../services/socket/initChat';
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
  const { isAuthenticated, user, isLoggingOut } = useAuth();
  
  // Initialize poll socket listeners to automatically refresh UI on poll events
  usePollSocket();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || isLoggingOut) {
      return;
    }

    initSocketHandlers();
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

    // Friend snapshot hydration is handled by AppRealtimeBridge (avoid duplicate API burst)

    return () => {
      // Cleanup will be handled by initChat's internal logic on next init
    };
  }, [isAuthenticated, user?.id, isLoggingOut]);

  // This component doesn't render anything
  return null;
}

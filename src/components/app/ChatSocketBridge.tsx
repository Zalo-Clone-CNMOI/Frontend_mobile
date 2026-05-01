import { useEffect, useRef } from 'react';
import {
  AUTO_JOIN_DELAY_MS,
  MAX_AUTO_JOIN_CONVERSATIONS,
  REALTIME_HYDRATION_BASE_DELAY_MS,
  REALTIME_HYDRATION_MAX_RETRIES,
} from '../../constants/realtime';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage, logError } from '../../services/errorService';
import { fetchRuntimeFriendSnapshot } from '../../services/realtime/runtimeFriendService';
import { getSocket } from '../../services/socket';
import { initChat } from '../../services/chatService';
import { useChatsStore } from '../../store/useChatsStore';
import { useRealtimeStore } from '../../store/useRealtimeStore';

/**
 * ChatSocketBridge - Component to initialize chat socket listeners
 * This component calls initChat function to register socket event listeners
 * for chat messages, reactions, presence, etc.
 */
export function ChatSocketBridge() {
  const { isAuthenticated, user } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearScheduledWork = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    if (!isAuthenticated || !user?.id) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      clearScheduledWork();
      return;
    }

    let isMounted = true;
    initChat().then((cleanup) => {
      if (isMounted) {
        cleanupRef.current = cleanup;
      } else {
        cleanup?.();
      }
    }).catch((error) => {
      logError('ChatSocketBridge', error, { action: 'init_chat' });
    });

    const joinAllConversations = async () => {
      try {
        await useChatsStore.getState().initializeChats();

        if (!isMounted) return;

        const conversations = useChatsStore.getState().chats;
        const socket = getSocket();
        const conversationsToJoin = conversations.slice(0, MAX_AUTO_JOIN_CONVERSATIONS);

        if (socket && conversationsToJoin.length > 0) {
          console.log(`[ChatSocketBridge] Auto-joining ${conversationsToJoin.length}/${conversations.length} conversations (limited to ${MAX_AUTO_JOIN_CONVERSATIONS})`);

          conversationsToJoin.forEach((chat) => {
            if (chat.conversationId) {
              socket.emit('chat:join', { conversation_id: chat.conversationId });
            }
          });

          console.log('[ChatSocketBridge] Auto-join completed');
        }
      } catch (error) {
        logError('ChatSocketBridge', error, { action: 'auto_join_conversations' });
      }
    };

    const autoJoinTimer = setTimeout(() => {
      if (isMounted) {
        joinAllConversations();
      }
    }, AUTO_JOIN_DELAY_MS);
    timersRef.current.push(autoJoinTimer);

    const retryCountRef = { current: 0 };

    const hydrateRealtimeStore = async () => {
      try {
        if (!isMounted) return;

        useRealtimeStore.getState().setHydrating(true);
        useRealtimeStore.getState().setHydrationError(null);

        const snapshot = await fetchRuntimeFriendSnapshot();

        if (!isMounted) return;

        useRealtimeStore.getState().setFriendSnapshot(snapshot);
        retryCountRef.current = 0;
        console.log('[ChatSocketBridge] Realtime store hydrated successfully');
      } catch (error) {
        if (!isMounted) return;

        const errorMessage = getErrorMessage(error, 'Failed to load friend data');
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : undefined;
        const isNetworkError = errorMessage.includes('Network Error') || errorCode === 'ECONNABORTED';
        const shouldRetry =
          retryCountRef.current < REALTIME_HYDRATION_MAX_RETRIES && isNetworkError;

        logError('ChatSocketBridge', error, {
          action: 'hydrate_realtime_store',
          attempt: retryCountRef.current + 1,
          maxAttempts: REALTIME_HYDRATION_MAX_RETRIES + 1,
        });

        if (shouldRetry) {
          retryCountRef.current += 1;
          const delay = REALTIME_HYDRATION_BASE_DELAY_MS * Math.pow(2, retryCountRef.current - 1);
          console.log(`[ChatSocketBridge] Retrying hydration in ${delay}ms...`);

          const retryTimer = setTimeout(() => {
            if (isMounted) {
              hydrateRealtimeStore();
            }
          }, delay);
          timersRef.current.push(retryTimer);
        } else {
          useRealtimeStore.getState().setHydrationError(errorMessage);
          console.warn('[ChatSocketBridge] Max retries reached or non-recoverable error. App will continue in offline mode.');
        }
      } finally {
        if (!isMounted) return;

        const shouldKeepHydrating =
          retryCountRef.current > 0 &&
          retryCountRef.current < REALTIME_HYDRATION_MAX_RETRIES &&
          !useRealtimeStore.getState().hydrationError;

        if (!shouldKeepHydrating) {
          useRealtimeStore.getState().setHydrating(false);
        }
      }
    };

    hydrateRealtimeStore();

    return () => {
      isMounted = false;
      clearScheduledWork();
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  return null;
}

import { useCallback } from 'react';
import { useMessagesStore } from '../store/useMessagesStore';
import { pinMessage as pinMessageApi, unpinMessage as unpinMessageApi } from '../services/messagesApi';

/**
 * Custom hook for message pin/unpin operations
 * Handles optimistic updates and socket synchronization
 */
export const useMessagePin = () => {
  const {
    addPinnedMessage,
    removePinnedMessage,
    isMessagePinned,
    updateMessage,
  } = useMessagesStore();

  /**
   * Pin a message with optimistic update
   * Flow:
   * 1. Optimistic update: add to pinned set locally
   * 2. Call API
   * 3. On success: socket will confirm (no action needed)
   * 4. On error: revert optimistic update
   */
  const pinMessage = useCallback(
    async (conversationId: string, createdAt: number, messageId: string) => {
      // Check if already pinned to avoid duplicate
      if (isMessagePinned(conversationId, messageId)) {
        return;
      }

      // Optimistic update
      addPinnedMessage(conversationId, messageId);
      updateMessage(conversationId, messageId, {
        isPinned: true,
        pinnedAt: Date.now(),
      });

      try {
        await pinMessageApi(conversationId, createdAt, messageId);
        // Success - socket will emit chat:message:pinned
        // No additional action needed - socket handler will sync
      } catch (error) {
        // Revert optimistic update on error
        removePinnedMessage(conversationId, messageId);
        updateMessage(conversationId, messageId, {
          isPinned: false,
          pinnedAt: undefined,
        });
        throw error;
      }
    },
    [isMessagePinned, addPinnedMessage, updateMessage, removePinnedMessage],
  );

  /**
   * Unpin a message with optimistic update
   * Flow:
   * 1. Optimistic update: remove from pinned set locally
   * 2. Call API
   * 3. On success: socket will confirm (no action needed)
   * 4. On error: revert optimistic update
   */
  const unpinMessage = useCallback(
    async (conversationId: string, createdAt: number, messageId: string) => {
      console.log('[useMessagePin unpinMessage] conversationId:', conversationId, 'createdAt:', createdAt, 'messageId:', messageId);
      
      // Check if not pinned to avoid unnecessary call
      if (!isMessagePinned(conversationId, messageId)) {
        console.log('[useMessagePin unpinMessage] Message not pinned, skipping');
        return;
      }

      // Optimistic update
      removePinnedMessage(conversationId, messageId);
      updateMessage(conversationId, messageId, {
        isPinned: false,
        pinnedAt: undefined,
      });

      try {
        console.log('[useMessagePin unpinMessage] Calling API...');
        await unpinMessageApi(conversationId, createdAt, messageId);
        console.log('[useMessagePin unpinMessage] API success');
        // Success - socket will emit chat:message:unpinned
        // No additional action needed - socket handler will sync
      } catch (error) {
        console.error('[useMessagePin unpinMessage] API error:', error);
        // Revert optimistic update
        addPinnedMessage(conversationId, messageId);
        updateMessage(conversationId, messageId, {
          isPinned: true,
          pinnedAt: Date.now(),
        });
        throw error;
      }
    },
    [isMessagePinned, removePinnedMessage, updateMessage, addPinnedMessage],
  );

  /**
   * Toggle pin status of a message
   */
  const togglePin = useCallback(
    async (conversationId: string, createdAt: number, messageId: string) => {
      if (isMessagePinned(conversationId, messageId)) {
        await unpinMessage(conversationId, createdAt, messageId);
      } else {
        await pinMessage(conversationId, createdAt, messageId);
      }
    },
    [isMessagePinned, pinMessage, unpinMessage],
  );

  return {
    pinMessage,
    unpinMessage,
    togglePin,
    isMessagePinned,
  };
};

export default useMessagePin;

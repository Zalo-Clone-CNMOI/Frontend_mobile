import { useCallback } from 'react';
import { pinMessage as pinMessageApi, unpinMessage as unpinMessageApi } from '../services/messagesApi';
import { useMessagesStore } from '../store/useMessagesStore';

export const useMessagePin = () => {
  const addPinnedMessage = useMessagesStore((s) => s.addPinnedMessage);
  const removePinnedMessage = useMessagesStore((s) => s.removePinnedMessage);
  const isMessagePinned = useMessagesStore((s) => s.isMessagePinned);

  const pinMessage = useCallback(async (conversationId: string, createdAt: number | string, messageId: string) => {
    await pinMessageApi(conversationId, Number(createdAt), messageId);
    addPinnedMessage(conversationId, messageId);
  }, [addPinnedMessage]);

  const unpinMessage = useCallback(async (conversationId: string, createdAt: number | string, messageId: string) => {
    await unpinMessageApi(conversationId, Number(createdAt), messageId);
    removePinnedMessage(conversationId, messageId);
  }, [removePinnedMessage]);

  return { pinMessage, unpinMessage, isMessagePinned };
};

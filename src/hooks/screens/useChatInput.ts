import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  sendMessage as sendSocketMessage,
  editMessage as sendSocketEditMessage,
  deleteMessage as sendSocketDeleteMessage,
  markConversationAsRead,
} from '@/src/services/chatService';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useChatsStore } from '@/src/store/useChatsStore';
import type { ChatMessage } from '@/src/types/chat';

interface UseChatInputOptions {
  chatId: string;
  currentUserId?: string;
  currentUserName?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function useChatInput({
  chatId,
  currentUserId,
  currentUserName,
  onTypingStart,
  onTypingStop,
}: UseChatInputOptions) {
  // Input state
  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);

  // Store actions
  const addMessage = useMessagesStore((state) => state.addMessage);
  const updateMessage = useMessagesStore((state) => state.updateMessage);
  const mergeMessageId = useMessagesStore((state) => state.mergeMessageId);
  const updateLastMessage = useChatsStore((state) => state.updateLastMessage);

  // Send text message
  const handleSend = useCallback(async () => {
    if (!input.trim() || !chatId) return;

    const text = input.trim();
    setInput('');

    // Notify typing stopped
    onTypingStop?.();

    try {
      const messageOptions: any = {};
      if (replyingMessage) {
        messageOptions.replyToMessage = replyingMessage;
        setReplyingMessage(null);
      }

      const { optimisticMessage, sendPromise } = await sendSocketMessage(
        chatId,
        text,
        [],
        messageOptions
      );

      addMessage(chatId, optimisticMessage);
      
      // Update last message in chat list (don't increment unread for own messages)
      updateLastMessage(chatId, text, 'text', Date.now(), currentUserId, currentUserName, false);

      await sendPromise;
      
      updateMessage(chatId, optimisticMessage.id, { status: 'sent' });
    } catch (error: any) {
      if (error?.message_id) {
        updateMessage(chatId, error.message_id, { status: 'failed' });
      }
      Alert.alert('Gửi tin nhắn thất bại', error?.message || 'Không thể gửi tin nhắn');
    }
  }, [input, chatId, replyingMessage, currentUserId, currentUserName, onTypingStop, addMessage, updateMessage, updateLastMessage]);

  // Send files
  const handleSendFiles = useCallback(async (files: any[]) => {
    if (files.length === 0 || !chatId) return;

    const fallbackLabel = files.length === 1
      ? (files[0]?.name || files[0]?.uri?.split('/')?.pop() || 'File')
      : `${files.length} files`;

    try {
      const messageOptions: any = {};
      if (replyingMessage) {
        messageOptions.replyToMessage = replyingMessage;
        setReplyingMessage(null);
      }

      const { optimisticMessage, sendPromise } = await sendSocketMessage(
        chatId,
        fallbackLabel,
        files,
        messageOptions
      );

      addMessage(chatId, optimisticMessage);
      
      updateLastMessage(chatId, fallbackLabel, 'file', Date.now(), currentUserId, currentUserName, false);

      await sendPromise;
      
      updateMessage(chatId, optimisticMessage.id, { status: 'sent' });
    } catch (error: any) {
      if (error?.message_id) {
        updateMessage(chatId, error.message_id, { status: 'failed' });
      }
      const reason = error?.reason || error?.message || 'Kiểm tra lại file đính kèm';
      Alert.alert('Gửi file thất bại', `Không thể gửi file: ${reason}`);
    }
  }, [chatId, replyingMessage, currentUserId, currentUserName, addMessage, updateMessage, updateLastMessage]);

  // Edit message
  const handleEdit = useCallback(async (messageId: string, newText: string, createdAt: number) => {
    if (!newText.trim() || !chatId) return;

    try {
      await sendSocketEditMessage(chatId, messageId, newText.trim(), createdAt);
      updateMessage(chatId, messageId, {
        text: newText.trim(),
        isEdited: true,
        editedAt: Date.now(),
      });
    } catch (error: any) {
      Alert.alert('Chỉnh sửa thất bại', error?.message || 'Không thể chỉnh sửa tin nhắn');
    }
  }, [chatId, updateMessage]);

  // Delete message
  const handleDelete = useCallback(async (messageId: string, createdAt: number) => {
    if (!chatId) return;

    try {
      await sendSocketDeleteMessage(chatId, messageId, createdAt);
      // Message will be removed via socket event
    } catch (error: any) {
      Alert.alert('Xóa thất bại', error?.message || 'Không thể xóa tin nhắn');
    }
  }, [chatId]);

  // Start editing
  const startEditing = useCallback((message: ChatMessage) => {
    setEditingMessage(message);
    setInput(message.text || '');
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
    setInput('');
  }, []);

  // Start replying
  const startReplying = useCallback((message: ChatMessage) => {
    setReplyingMessage(message);
  }, []);

  // Cancel replying
  const cancelReplying = useCallback(() => {
    setReplyingMessage(null);
  }, []);

  // Handle typing
  const handleTyping = useCallback((text: string) => {
    setInput(text);
    if (text.length > 0) {
      onTypingStart?.();
    }
  }, [onTypingStart]);

  return {
    // State
    input,
    editingMessage,
    replyingMessage,

    // Setters
    setInput,

    // Actions
    handleSend,
    handleSendFiles,
    handleEdit,
    handleDelete,
    startEditing,
    cancelEditing,
    startReplying,
    cancelReplying,
    handleTyping,
  };
}

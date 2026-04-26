import type { ChatMessage } from '@/src/types/chat';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
} from 'react-native';
import { ContactList } from './ContactList';
import { FilePreview } from './FilePreview';
import { Header } from './Header';
import { useConversations } from './hooks/useConversations';
import { styles } from './styles';

const MAX_SELECTION_COUNT = 20;

interface ForwardModalProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onForward: (
    message: ChatMessage,
    conversationIds: string[],
    optionalMessage?: string
  ) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  visible,
  message,
  onClose,
  onForward,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [localMessage, setLocalMessage] = useState<ChatMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optionalMessage, setOptionalMessage] = useState('');

  const { conversations, loading, loadConversations, filteredConversations } =
    useConversations();

  const filteredChats = filteredConversations(searchQuery);

  // Store message locally when prop changes
  useEffect(() => {
    if (message) {
      setLocalMessage(message);
    }
  }, [message]);

  // Clear selections when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setOptionalMessage('');
      setSearchQuery('');
    }
  }, [visible]);

  // Fetch conversations when modal opens
  useEffect(() => {
    if (visible) {
      loadConversations();
    }
  }, [visible, loadConversations]);

  const toggleSelection = useCallback((conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        if (next.size >= MAX_SELECTION_COUNT) {
          // Backend limit is 20 targets
          return prev;
        }
        next.add(conversationId);
      }
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    const messageToForward = localMessage || message;
    if (!messageToForward || selectedIds.size === 0) {
      return;
    }
    onForward(
      messageToForward,
      Array.from(selectedIds),
      optionalMessage.trim() || undefined
    );
    onClose();
    // Reset state after sending
    setSearchQuery('');
    setLocalMessage(null);
    setOptionalMessage('');
    setSelectedIds(new Set());
  }, [
    localMessage,
    message,
    selectedIds,
    optionalMessage,
    onForward,
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: '#F5F5F5' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCount={selectedIds.size}
          onClose={onClose}
        />

        <View style={styles.bodyContainer}>
          <ContactList
            conversations={filteredChats}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            loading={loading}
          />
        </View>

        <FilePreview
          message={localMessage}
          optionalMessage={optionalMessage}
          onOptionalMessageChange={setOptionalMessage}
          selectedCount={selectedIds.size}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ForwardModal;

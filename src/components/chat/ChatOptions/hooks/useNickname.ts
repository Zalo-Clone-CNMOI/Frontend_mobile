import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { updateMySettings } from '@/src/services/conversationsApi';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';

interface UseNicknameOptions {
  chatId: string;
  currentNickname: string;
}

interface UseNicknameReturn {
  visible: boolean;
  input: string;
  updating: boolean;
  openModal: () => void;
  closeModal: () => void;
  setInput: (value: string) => void;
  save: (onSuccess?: () => void) => Promise<void>;
}

export const useNickname = ({
  chatId,
  currentNickname,
}: UseNicknameOptions): UseNicknameReturn => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState(currentNickname);
  const [updating, setUpdating] = useState(false);

  const storeUpdateMySettings = useConversationDetailStore(
    (state) => state.updateMySettings
  );

  const refreshConversationDetails = useConversationDetailStore(
    (state) => state.fetchConversationDetail
  );

  const openModal = useCallback(() => {
    setInput(currentNickname);
    setVisible(true);
  }, [currentNickname]);

  const closeModal = useCallback(() => {
    setVisible(false);
    setInput('');
  }, []);

  const save = useCallback(
    async (onSuccess?: () => void) => {
      const trimmed = input.trim();

      if (trimmed.length > 100) {
        Alert.alert(t('common.error'), t('chat_options.nickname_too_long'));
        return;
      }

      setUpdating(true);
      try {
        await updateMySettings(chatId, { nickname: trimmed || undefined });
        storeUpdateMySettings(chatId, { nickname: trimmed || undefined });
        refreshConversationDetails(chatId, true).catch(() => {});
        closeModal();
        Alert.alert(t('common.success'), t('chat_options.nickname_updated'));
        onSuccess?.();
      } catch (error: any) {
        Alert.alert(
          t('common.error'),
          error.message || t('chat_options.nickname_update_failed')
        );
      } finally {
        setUpdating(false);
      }
    },
    [input, chatId, storeUpdateMySettings, refreshConversationDetails, closeModal, t]
  );

  return {
    visible,
    input,
    updating,
    openModal,
    closeModal,
    setInput,
    save,
  };
};

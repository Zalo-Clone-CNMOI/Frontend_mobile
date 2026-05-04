import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Text, View, Alert, KeyboardAvoidingView } from 'react-native';
import { formatTimeAgoSafe } from '@/src/utils/timeAgo';
import { usePollStore } from '@/src/store/usePollStore';
import { canClosePoll, canEditPoll } from '@/src/services/pollsApi';
import { EditPollRequestDTO } from '@/src/types/dto/PollDTO';
import { AddOptionButton, AddOptionForm } from './AddOptionForm';
import { EditPollModal } from './EditPollModal';
import { LoadingState } from './LoadingState';
import { PollFooter } from './PollFooter';
import { PollHeader } from './PollHeader';
import { PollOptions } from './PollOptions';
import { usePollDetail } from './hooks/usePollDetail';
import { styles } from './styles';

interface PollDetailModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  pollId: string;
  currentUserId: string;
  groupName?: string;
  // User role in group (for permission checks)
  userRole?: 'owner' | 'admin' | 'member';
  // Callbacks
  onPollClosed?: (pollId: string) => void;
  onPollEdited?: (pollId: string) => void;
  onVoteSuccess?: () => void;
}

export const PollDetailModal: React.FC<PollDetailModalProps> = ({
  visible,
  onClose,
  conversationId,
  pollId,
  currentUserId,
  groupName = '',
  userRole = 'member',
  onPollClosed,
  onPollEdited,
  onVoteSuccess,
}) => {
  const { t } = useTranslation();
  const {
    poll,
    isLoading,
    selectedOptions,
    hasVoted,
    isAddingOption,
    isSubmitting,
    newOptionLabel,
    isClosed,
    isExpired,
    isActive,
    creatorName,
    toggleOption,
    castVote,
    addOption,
    removeOption,
    setIsAddingOption,
    setNewOptionLabel,
    loadPollDetail,
  } = usePollDetail({ conversationId, pollId, visible });

  // ALL hooks must be declared BEFORE any conditional return
  const pollStore = usePollStore();
  const [isClosing, setIsClosing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRemovingOption, setIsRemovingOption] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isVotingAction, setIsVotingAction] = useState(false);
  const [isAddingOptionAction, setIsAddingOptionAction] = useState(false);

  // Check permissions (safe to compute even if poll is null)
  const userCanClose = poll ? canClosePoll(poll, currentUserId, userRole) : false;
  const userCanEdit = poll ? canEditPoll(poll, currentUserId) : false;

  // Handle close poll
  const handleClosePoll = useCallback(async () => {
    if (!userCanClose || isClosed) return;

    Alert.alert(
      t('pollDetail.closePollConfirmTitle', 'Kết thúc bình chọn?'),
      t('pollDetail.closePollConfirmMessage', 'Bình chọn sẽ kết thúc và không thể tiếp tục bình chọn.'),
      [
        { text: t('common.cancel', 'Hủy'), style: 'cancel' },
        {
          text: t('pollDetail.closePoll', 'Kết thúc'),
          style: 'destructive',
          onPress: async () => {
            setIsClosing(true);
            try {
              await pollStore.closePoll(conversationId, pollId);
              onPollClosed?.(pollId);
            } catch (error) {
              console.error('Failed to close poll:', error);
              Alert.alert(
                t('common.error', 'Lỗi'),
                t('pollDetail.closePollError', 'Không thể kết thúc bình chọn. Vui lòng thử lại.')
              );
            } finally {
              setIsClosing(false);
            }
          },
        },
      ]
    );
  }, [userCanClose, isClosed, conversationId, pollId, pollStore, onPollClosed, t]);

  // Handle edit poll
  const handleEditPoll = useCallback(() => {
    if (!userCanEdit || isClosed) return;
    setShowEditModal(true);
  }, [userCanEdit, isClosed]);

  // Handle edit submit
  const handleEditSubmit = useCallback(async (payload: EditPollRequestDTO) => {
    setIsEditing(true);
    try {
      await pollStore.editPoll(conversationId, pollId, payload);
      onPollEdited?.(pollId);
      setShowEditModal(false);
      // Refresh poll detail in background (don't await to avoid blocking UI)
      loadPollDetail();
    } catch (error: any) {
      console.error('Failed to edit poll:', error);

      // Handle specific error codes with user-friendly messages
      const errorCode = error?.code || error?.response?.data?.error?.code;
      let errorMessage = t('pollDetail.editPollError', 'Không thể chỉnh sửa bình chọn. Vui lòng thử lại.');

      if (errorCode === 'POLL_CANNOT_EDIT_MULTIPLE_WITH_VOTES') {
        errorMessage = t(
          'pollDetail.cannotEditMultipleWithVotes',
          'Không thể thay đổi chế độ chọn nhiều đáp án vì đã có người bình chọn. Bạn vẫn có thể sửa câu hỏi, thêm đáp án hoặc đóng bình chọn.'
        );
      } else if (errorCode === 'POLL_CANNOT_EDIT_OPTION_WITH_VOTES') {
        errorMessage = t(
          'pollDetail.cannotEditOptionWithVotes',
          'Không thể sửa lựa chọn đã có người bình chọn.'
        );
      } else if (errorCode === 'POLL_PERMISSION_DENIED') {
        errorMessage = t('pollDetail.permissionDenied', 'Bạn không có quyền chỉnh sửa bình chọn này.');
      } else if (errorCode === 'POLL_CLOSED') {
        errorMessage = t('pollDetail.pollClosed', 'Bình chọn đã kết thúc, không thể chỉnh sửa.');
      }

      Alert.alert(t('common.error', 'Lỗi'), errorMessage);
    } finally {
      setIsEditing(false);
    }
  }, [conversationId, pollId, pollStore, onPollEdited, t, loadPollDetail]);

  // Handle vote with error handling and protection against multiple clicks
  const handleVote = useCallback(async () => {
    if (isVotingAction || isSubmitting) {
      console.log('[PollDetailModal] Vote already in progress, ignoring click');
      return;
    }

    setIsVotingAction(true);
    try {
      await castVote();
      onVoteSuccess?.();
    } catch (error: any) {
      console.error('Failed to cast vote:', error);
      Alert.alert(
        t('common.error', 'Lỗi'),
        error.message || t('pollDetail.voteError', 'Không thể bình chọn. Vui lòng thử lại.')
      );
    } finally {
      setIsVotingAction(false);
    }
  }, [castVote, t, onVoteSuccess, isVotingAction, isSubmitting]);

  // Handle remove option
  const handleRemoveOption = useCallback(async (optionId: string) => {
    if (!userCanEdit || isClosed) return;

    Alert.alert(
      t('pollDetail.removeOptionConfirmTitle', 'Xóa lựa chọn?'),
      t('pollDetail.removeOptionConfirmMessage', 'Lựa chọn này sẽ bị xóa khỏi bình chọn.'),
      [
        { text: t('common.cancel', 'Hủy'), style: 'cancel' },
        {
          text: t('pollDetail.removeOption', 'Xóa'),
          style: 'destructive',
          onPress: async () => {
            setIsRemovingOption(optionId);
            try {
              await removeOption(optionId);
            } catch (error) {
              console.error('Failed to remove option:', error);
              Alert.alert(
                t('common.error', 'Lỗi'),
                t('pollDetail.removeOptionError', 'Không thể xóa lựa chọn. Chỉ có thể xóa khi chưa có ai bình chọn.')
              );
            } finally {
              setIsRemovingOption(null);
            }
          },
        },
      ]
    );
  }, [userCanEdit, isClosed, removeOption, t]);

  // EARLY RETURN - After ALL hooks are declared
  if (isLoading || !poll) {
    return <LoadingState visible={visible} />;
  }

  const displayCreatorName = creatorName;
  const createdAt = (poll as any).created_at;
  const timeAgo = formatTimeAgoSafe(createdAt, t);
  const showAddOption = poll.allow_add_option && isActive;
  const showVoteButton = isActive;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <PollHeader
            groupName={groupName}
            creatorName={creatorName}
            onClose={onClose}
            canClose={userCanClose}
            canEdit={userCanEdit}
            isClosed={isClosed}
            onClosePoll={handleClosePoll}
            onEditPoll={handleEditPoll}
            isClosing={isClosing}
          />

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: undefined,
            }}
          >
            {/* Question */}
            <Text style={styles.question}>{poll.question}</Text>

            {/* Metadata - only show if creator name is available */}
            {displayCreatorName && (
              <Text style={styles.metadata}>
                {displayCreatorName} • {timeAgo}
              </Text>
            )}

            {/* Multiple choice indicator */}
            {poll.allow_multiple && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingIcon}>
                    <View style={styles.checkboxIcon} />
                  </View>
                  <Text style={styles.settingText}>
                    {t('pollDetail.multipleChoice')}
                  </Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Options */}
            <PollOptions
              poll={poll}
              selectedOptions={selectedOptions}
              hasVoted={hasVoted}
              isClosed={isClosed}
              isActive={isActive}
              onToggleOption={toggleOption}
              currentUserId={currentUserId}
              onRemoveOption={handleRemoveOption}
              isRemovingOption={isRemovingOption}
            />

            {/* Add Option */}
            {showAddOption && isAddingOption && (
              <AddOptionForm
                value={newOptionLabel}
                onChangeText={setNewOptionLabel}
                onSubmit={addOption}
                isLoading={isSubmitting}
              />
            )}
            {showAddOption && !isAddingOption && (
              <AddOptionButton onPress={() => setIsAddingOption(true)} />
            )}
          </ScrollView>

          {/* Vote Button */}
          {(showVoteButton || hasVoted) && (
            <PollFooter
              selectedCount={selectedOptions.length}
              onVote={handleVote}
              disabled={!isActive}
              isVoting={isSubmitting}
            />
          )}
        </KeyboardAvoidingView>
      </View>

      {/* Edit Poll Modal - Always render to maintain hook order */}
      <EditPollModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        poll={poll}
        conversationId={conversationId}
        onSubmit={handleEditSubmit}
        isSubmitting={isEditing}
      />
    </Modal>
  );
};

export default PollDetailModal;

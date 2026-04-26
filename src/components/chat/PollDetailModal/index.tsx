import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Text, View } from 'react-native';
import { formatTimeAgoSafe } from '@/src/utils/timeAgo';
import { AddOptionButton, AddOptionForm } from './AddOptionForm';
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
}

export const PollDetailModal: React.FC<PollDetailModalProps> = ({
  visible,
  onClose,
  conversationId,
  pollId,
  currentUserId,
  groupName = '',
}) => {
  const { t } = useTranslation();
  const {
    poll,
    isLoading,
    selectedOptions,
    hasVoted,
    isAddingOption,
    newOptionLabel,
    isClosed,
    toggleOption,
    castVote,
    addOption,
    setIsAddingOption,
    setNewOptionLabel,
  } = usePollDetail({ conversationId, pollId, visible });

  if (isLoading || !poll) {
    return <LoadingState visible={visible} />;
  }

  const creatorName = (poll as any).creator_name || poll.creator_id || t('pollDetail.unknownUser');
  const createdAt = (poll as any).created_at;
  const timeAgo = formatTimeAgoSafe(createdAt, t);
  const showAddOption = poll.allow_add_option && !isClosed && !hasVoted;
  const showVoteButton = !hasVoted && !isClosed;

  console.log('[PollDetailModal] Debug:', {
    pollId,
    allow_add_option: poll.allow_add_option,
    isClosed,
    hasVoted,
    showAddOption,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <PollHeader
            groupName={groupName}
            onClose={onClose}
            onMorePress={() => {
              // TODO: Implement more options
            }}
          />

          <ScrollView style={styles.content}>
            {/* Question */}
            <Text style={styles.question}>{poll.question}</Text>

            {/* Metadata */}
            <Text style={styles.metadata}>
              {creatorName} • {timeAgo}
            </Text>

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
              onToggleOption={toggleOption}
            />

            {/* Add Option */}
            {showAddOption && (
              <>
                {isAddingOption ? (
                  <AddOptionForm
                    value={newOptionLabel}
                    onChangeText={setNewOptionLabel}
                    onSubmit={addOption}
                    isLoading={isAddingOption}
                  />
                ) : (
                  <AddOptionButton onPress={() => setIsAddingOption(true)} />
                )}
              </>
            )}
          </ScrollView>

          {/* Vote Button */}
          {showVoteButton && (
            <PollFooter
              selectedCount={selectedOptions.length}
              onVote={castVote}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PollDetailModal;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import type { PollMessageMetadata } from '@/src/types/dto/PollDTO';
import { usePollStore } from '@/src/store/usePollStore';
import type { ChatMessage } from '@/src/types/chat';
import PollDetailModal from './PollDetailModal';

interface PollCardProps {
  message: ChatMessage;
  metadata: PollMessageMetadata;
  conversationId: string;
  currentUserId: string;
  userRole?: 'owner' | 'admin' | 'member';
  onViewDetail?: (pollId: string) => void;
  onVote?: (pollId: string, optionIds: string[]) => void;
}

export function PollCard({
  message,
  metadata,
  conversationId,
  currentUserId,
  userRole,
  onViewDetail,
  onVote,
}: PollCardProps) {
  const { t } = useTranslation();
  const pollStore = usePollStore();

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPollData, setCurrentPollData] = useState(metadata);
  const [isModalOpening, setIsModalOpening] = useState(false);

  // Sync with store - get full poll data for real-time updates
  useEffect(() => {
    const updateFromStore = () => {
      const poll = pollStore.getPollById(metadata.poll_id);
      if (poll) {
        console.log('[PollCard] Updating from store:', {
          pollId: metadata.poll_id,
          my_vote: 'my_vote' in poll ? poll.my_vote : undefined,
          total_votes: 'total_votes' in poll ? poll.total_votes : poll.total_votes,
          status: 'status' in poll ? poll.status : metadata.status,
          options_count: poll.options?.length || metadata.options?.length
        });
        
        // Update current poll data with store data (merge with metadata as fallback)
        const rawOptions = poll.options || metadata.options;
        
        // Filter duplicate options by option_id to prevent React key errors
        const uniqueOptions = rawOptions.filter((option, index, self) => 
          self.findIndex(o => o.option_id === option.option_id) === index
        );
        
        const mergedPoll = {
          ...metadata,
          ...poll,
          // Ensure we have all required fields
          poll_id: metadata.poll_id,
          question: poll.question || metadata.question,
          options: uniqueOptions,
          total_votes: 'total_votes' in poll ? poll.total_votes : metadata.total_votes,
          status: 'status' in poll ? poll.status : metadata.status,
          expires_at: poll.expires_at || metadata.expires_at,
          allow_multiple: poll.allow_multiple ?? metadata.allow_multiple,
          allow_add_option: poll.allow_add_option ?? metadata.allow_add_option,
        };
        
        setCurrentPollData(mergedPoll);
        
        // Update vote state
        if ('my_vote' in poll && Array.isArray(poll.my_vote)) {
          setSelectedOptions(poll.my_vote || []);
          setHasVoted((poll.my_vote?.length || 0) > 0);
        }
      }
    };

    // Initial sync
    updateFromStore();

    // Subscribe to store changes using Zustand
    const unsubscribe = usePollStore.subscribe((state) => {
      const poll = state.pollDetails.get(metadata.poll_id) || state.pollMetadata.get(metadata.poll_id);
      if (poll) {
        console.log('[PollCard] Store change detected:', {
          pollId: metadata.poll_id,
          my_vote: 'my_vote' in poll ? poll.my_vote : undefined,
          total_votes: 'total_votes' in poll ? poll.total_votes : poll.total_votes,
          status: 'status' in poll ? poll.status : metadata.status,
          options_count: poll.options?.length || metadata.options?.length,
          question: 'question' in poll ? poll.question : metadata.question
        });
        
        // Update current poll data
        const rawOptions = poll.options || metadata.options;
        
        // Filter duplicate options by option_id to prevent React key errors
        const uniqueOptions = rawOptions.filter((option, index, self) => 
          self.findIndex(o => o.option_id === option.option_id) === index
        );
        
        const mergedPoll = {
          ...metadata,
          ...poll,
          poll_id: metadata.poll_id,
          question: poll.question || metadata.question,
          options: uniqueOptions,
          total_votes: 'total_votes' in poll ? poll.total_votes : metadata.total_votes,
          status: 'status' in poll ? poll.status : metadata.status,
          expires_at: poll.expires_at || metadata.expires_at,
          allow_multiple: poll.allow_multiple ?? metadata.allow_multiple,
          allow_add_option: poll.allow_add_option ?? metadata.allow_add_option,
        };
        
        setCurrentPollData(mergedPoll);
        
        // Update vote state
        if ('my_vote' in poll && Array.isArray(poll.my_vote)) {
          setSelectedOptions(poll.my_vote || []);
          setHasVoted((poll.my_vote?.length || 0) > 0);
        }
      }
    });

    return unsubscribe;
  }, [metadata.poll_id]);

  const isClosed = currentPollData.status === 'closed';
  const isExpired = currentPollData.expires_at && Date.now() > currentPollData.expires_at;

  const handleCardPress = () => {
    // Prevent multiple clicks while modal is opening or already open
    if (isModalOpening || showDetailModal) {
      console.log('[PollCard] Modal already opening or open, ignoring click');
      return;
    }

    if (isClosed || isExpired) {
      Alert.alert(
        t('poll.expiredAlertTitle'),
        t('poll.expiredAlertMessage'),
        [{ text: t('poll.viewResults'), onPress: () => {
          if (!isModalOpening && !showDetailModal) {
            setIsModalOpening(true);
            setShowDetailModal(true);
            // Reset opening state after a short delay
            setTimeout(() => setIsModalOpening(false), 300);
          }
        }}]
      );
      return;
    }

    // Set opening state and show modal
    setIsModalOpening(true);
    setShowDetailModal(true);
    
    // Reset opening state after a short delay to prevent rapid clicks
    setTimeout(() => setIsModalOpening(false), 300);
  };

  const handleToggleOption = async (optionId: string) => {
    if (isClosed || isExpired) return;

    const poll = pollStore.getPollById(metadata.poll_id);
    const isMultiple = poll?.allow_multiple ?? currentPollData.allow_multiple;

    let newSelection: string[];

    if (isMultiple) {
      // Multi-choice: toggle selection
      if (selectedOptions.includes(optionId)) {
        newSelection = selectedOptions.filter(id => id !== optionId);
      } else {
        newSelection = [...selectedOptions, optionId];
      }
    } else {
      // Single choice: replace selection
      if (selectedOptions.includes(optionId)) {
        newSelection = []; // Deselect
      } else {
        newSelection = [optionId];
      }
    }

    setSelectedOptions(newSelection);

    try {
      if (newSelection.length === 0) {
        // Retract vote
        await pollStore.retractVote(conversationId, metadata.poll_id);
        setHasVoted(false);
      } else {
        // Cast vote
        await pollStore.castVote(conversationId, metadata.poll_id, newSelection);
        setHasVoted(true);
      }
      onVote?.(metadata.poll_id, newSelection);
    } catch (error) {
      // Revert on error
      const poll = pollStore.getPollById(metadata.poll_id);
      const myVote = poll && 'my_vote' in poll ? poll.my_vote : [];
      setSelectedOptions(myVote || []);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handleCardPress}
        activeOpacity={0.9}
      >
        {/* Question */}
        <Text style={styles.question} numberOfLines={2}>
          {currentPollData.question}
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentPollData.options.map((option) => (
            <TouchableOpacity
              key={option.option_id}
              style={[
                styles.option,
                selectedOptions.includes(option.option_id) && styles.optionSelected,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleOption(option.option_id);
              }}
              disabled={!!(isClosed || isExpired || hasVoted)} // Disable khi đã vote
            >
              <Text style={[
                styles.optionText,
                selectedOptions.includes(option.option_id) && styles.optionTextSelected,
              ]} numberOfLines={1}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vote Button - Chỉ hiện khi chưa vote */}
        {!hasVoted && !isClosed && !isExpired ? (
          <TouchableOpacity
            style={styles.voteButton}
            onPress={(e) => {
              e.stopPropagation();
              // Thường Zalo sẽ gửi vote ngay khi chọn, nhưng nếu có nút thì dùng logic store
              // handleCastVote(conversationId, metadata.poll_id, selectedOptions);
            }}
            disabled={selectedOptions.length === 0}
          >
            <Text style={[
              styles.voteButtonText,
              selectedOptions.length === 0 ? styles.voteButtonTextDisabled : null,
            ]}>
              {t('poll.voteButton')}
            </Text>
          </TouchableOpacity>
        ) : (
          // Footer (hasVoted hoặc closed)
          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.voteCount}>
              {currentPollData.total_votes || 0} {t('poll.votes')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Detail Modal - Only render when showDetailModal is true */}
      {showDetailModal && (
        <PollDetailModal
          visible={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setIsModalOpening(false); // Reset opening state when modal closes
            // Force refresh to get latest poll data
            const poll = pollStore.getPollById(metadata.poll_id);
            if (poll && 'my_vote' in poll && Array.isArray(poll.my_vote)) {
              setSelectedOptions(poll.my_vote || []);
              setHasVoted((poll.my_vote?.length || 0) > 0);
            }
          }}
          conversationId={conversationId}
          pollId={metadata.poll_id}
          currentUserId={currentUserId}
          userRole={userRole}
          onVoteSuccess={() => setShowDetailModal(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16, // Padding tổng thể
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Shadow nhẹ
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  question: {
    fontSize: 18, // Giảm cỡ chữ câu hỏi
    fontWeight: '700',
    color: '#000',
    marginBottom: 12, // Tăng khoảng cách xuống option
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 8, // Khoảng cách giữa các option khít hơn
    marginBottom: 16, // Khoảng cách xuống footer
  },
  option: {
    backgroundColor: '#EDF0F1', // Màu nền option nhạt hơn
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1, // Thêm viền khi chọn
    borderColor: '#0068FF',
  },
  optionText: {
    fontSize: 15,
    color: '#1a1a1a', // Màu chữ đậm hơn
  },
  optionTextSelected: {
    color: '#0068FF',
    fontWeight: '500',
  },
  voteButton: {
    width: '100%', // Nút chiếm full chiều ngang
    backgroundColor: '#F0F7FF', // Màu nền xanh cực nhạt
    borderRadius: 20, // Bo góc viên thuốc
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonText: {
    fontSize: 16, // Tăng cỡ chữ nút
    fontWeight: 'bold', // Đậm hơn
    color: '#0068FF',
    letterSpacing: 0.5,
  },
  voteButtonTextDisabled: {
    color: '#A1B7CB', // Màu chữ khi disable
  },
  footer: {
    width: '100%',
    marginTop: 4, // Khoảng cách nhỏ từ option
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F2', // Đường gạch ngang nhạt
    width: '100%',
    marginBottom: 12,
  },
  voteCount: {
    fontSize: 13, // Cỡ chữ nhỏ hơn cho footer
    color: '#717171', // Màu xám footer
    textAlign: 'left', // Căn trái
  },
});

export default PollCard;
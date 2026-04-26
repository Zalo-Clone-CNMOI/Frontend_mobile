import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  const pollStore = usePollStore();

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Sync with store
  useEffect(() => {
    const poll = pollStore.getPollById(metadata.poll_id);
    if (poll && 'my_vote' in poll && Array.isArray(poll.my_vote)) {
      setSelectedOptions(poll.my_vote || []);
      setHasVoted((poll.my_vote?.length || 0) > 0);
    }
  }, [metadata.poll_id, pollStore]);

  const isClosed = metadata.status === 'closed';
  const isExpired = metadata.expires_at && Date.now() > metadata.expires_at;

  const handleToggleOption = async (optionId: string) => {
    if (isClosed || isExpired) return;

    const poll = pollStore.getPollById(metadata.poll_id);
    const isMultiple = poll?.allow_multiple ?? metadata.allow_multiple;

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
        onPress={() => setShowDetailModal(true)}
        activeOpacity={0.9}
      >
        {/* Question */}
        <Text style={styles.question} numberOfLines={2}>
          {metadata.question}
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {metadata.options.map((option) => (
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
              BÌNH CHỌN
            </Text>
          </TouchableOpacity>
        ) : (
          // Footer (hasVoted hoặc closed)
          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.voteCount}>
              {metadata.total_votes || 0} lượt bình chọn
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Detail Modal */}
      <PollDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        conversationId={conversationId}
        pollId={metadata.poll_id}
        currentUserId={currentUserId}
      />
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
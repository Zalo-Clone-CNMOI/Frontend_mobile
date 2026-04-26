import {
  ChevronLeft,
  MoreHorizontal,
  Plus,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePollStore } from '@/src/store/usePollStore';
import type { PollDetail } from '@/src/types/dto/PollDTO';

interface PollDetailModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  pollId: string;
  currentUserId: string;
  groupName?: string;
}

export function PollDetailModal({
  visible,
  onClose,
  conversationId,
  pollId,
  currentUserId,
  groupName = 'CNMOI_HK2_25-26',
}: PollDetailModalProps) {
  const pollStore = usePollStore();

  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  useEffect(() => {
    if (visible && pollId) {
      loadPollDetail();
    }
  }, [visible, pollId]);

  const loadPollDetail = async () => {
    setIsLoading(true);
    try {
      const detail = await pollStore.fetchPollDetail(conversationId, pollId, true);
      if (detail) {
        setPoll(detail);
        setSelectedOptions(detail.my_vote || []);
        setHasVoted((detail.my_vote?.length || 0) > 0);
      }
    } catch (error) {
      console.error('Failed to load poll detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isClosed = poll?.status === 'closed';

  const handleToggleOption = (optionId: string) => {
    if (hasVoted || isClosed) return;

    const isMultiple = poll?.allow_multiple ?? false;
    if (isMultiple) {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleCastVote = async () => {
    if (selectedOptions.length === 0) return;
    try {
      await pollStore.castVote(conversationId, pollId, selectedOptions);
      setHasVoted(true);
      await loadPollDetail();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddOption = async () => {
    if (!newOptionLabel.trim() || !poll) return;
    setIsAddingOption(true);
    try {
      await pollStore.addOption(conversationId, pollId, newOptionLabel.trim());
      setNewOptionLabel('');
      await loadPollDetail();
    } catch (error) {
      console.error('Failed to add option:', error);
    } finally {
      setIsAddingOption(false);
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa xong';
  };

  if (isLoading || !poll) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
              <ChevronLeft size={24} color="#000" />
              <View style={styles.headerSeparator} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Chi tiết bình chọn</Text>
              <Text style={styles.headerSubtitle}>{groupName}</Text>
            </View>

            <TouchableOpacity style={styles.headerRight}>
              <MoreHorizontal size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {/* Question */}
            <Text style={styles.question}>{poll.question}</Text>

            {/* Metadata */}
            <Text style={styles.metadata}>
              {(poll as any).creator_name || poll.creator_id || 'Người dùng'} • {(poll as any).created_at ? formatTimeAgo((poll as any).created_at) : 'Vừa xong'}
            </Text>

            {/* Multiple choice indicator */}
            {poll.allow_multiple && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingIcon}>
                    <View style={styles.checkboxIcon} />
                  </View>
                  <Text style={styles.settingText}>Chọn được nhiều phương án</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Options */}
            <View style={styles.optionsContainer}>
              {poll.options.map((option, index) => {
                const isSelected = selectedOptions.includes(option.option_id);
                return (
                  <TouchableOpacity
                    key={option.option_id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleToggleOption(option.option_id)}
                    disabled={hasVoted || isClosed}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add Option Button */}
            {poll.allow_add_option && !isClosed && !hasVoted && (
              <>
                {isAddingOption ? (
                  <View style={styles.addOptionInputContainer}>
                    <TextInput
                      style={styles.addOptionInput}
                      placeholder="Nhập phương án mới..."
                      placeholderTextColor="#999"
                      value={newOptionLabel}
                      onChangeText={setNewOptionLabel}
                      autoFocus
                      maxLength={200}
                    />
                    <TouchableOpacity
                      style={[styles.addOptionConfirmButton, !newOptionLabel.trim() && styles.addOptionConfirmButtonDisabled]}
                      onPress={handleAddOption}
                      disabled={!newOptionLabel.trim() || isAddingOption}
                    >
                      <Text style={styles.addOptionConfirmText}>Đồng ý</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addOptionButton} onPress={() => setIsAddingOption(true)}>
                    <Text style={styles.addOptionIcon}>+</Text>
                    <Text style={styles.addOptionText}>THÊM PHƯƠNG ÁN</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom Action Bar */}
          {!hasVoted && !isClosed && (
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.voteButton, selectedOptions.length === 0 && styles.voteButtonDisabled]}
                onPress={handleCastVote}
                disabled={selectedOptions.length === 0}
              >
                <Text style={styles.voteButtonText}>BÌNH CHỌN</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
    marginLeft: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  headerRight: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  metadata: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIcon: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 2,
  },
  settingText: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#0068FF',
  },
  optionText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#0068FF',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addOptionIcon: {
    fontSize: 20,
    color: '#888',
    marginRight: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  addOptionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addOptionInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
  },
  addOptionConfirmButton: {
    backgroundColor: '#0068FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addOptionConfirmButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addOptionConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  voteButton: {
    backgroundColor: '#0068FF',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  voteButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PollDetailModal;

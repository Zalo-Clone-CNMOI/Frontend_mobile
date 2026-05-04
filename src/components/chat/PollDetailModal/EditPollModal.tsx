import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { PollDetail, EditPollRequestDTO } from '@/src/types/dto/PollDTO';

interface EditPollModalProps {
  visible: boolean;
  onClose: () => void;
  poll: PollDetail;
  conversationId: string;
  onSubmit: (payload: EditPollRequestDTO) => Promise<void>;
  isSubmitting?: boolean;
}

export const EditPollModal: React.FC<EditPollModalProps> = ({
  visible,
  onClose,
  poll,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();

  // Form state - initialize with empty values if poll is null
  const [question, setQuestion] = useState(poll?.question ?? '');
  const [allowMultiple, setAllowMultiple] = useState(poll?.allow_multiple ?? false);
  const [allowAddOption, setAllowAddOption] = useState(poll?.allow_add_option ?? false);
  const [editedOptionLabels, setEditedOptionLabels] = useState<{ option_id: string; label: string }[]>([]);

  // Check if poll has any votes (to disable allow_multiple toggle)
  const hasVotes = poll?.total_votes > 0 || poll?.options.some(o => o.vote_count > 0);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible && poll) {
      setQuestion(poll.question);
      setAllowMultiple(poll.allow_multiple);
      setAllowAddOption(poll.allow_add_option);
      setEditedOptionLabels([]);
    }
  }, [visible, poll]);

  const hasChanges = poll
    ? question !== poll.question ||
      allowMultiple !== poll.allow_multiple ||
      allowAddOption !== poll.allow_add_option ||
      editedOptionLabels.length > 0
    : false;

  const handleSubmit = useCallback(async () => {
    if (!poll) return;
    
    if (!question.trim()) {
      Alert.alert(
        t('common.error', 'Lỗi'),
        t('pollDetail.questionRequired', 'Vui lòng nhập câu hỏi')
      );
      return;
    }

    const payload: EditPollRequestDTO = {};

    if (question !== poll.question) {
      payload.question = question.trim();
    }
    if (allowMultiple !== poll.allow_multiple) {
      payload.allow_multiple = allowMultiple;
    }
    if (allowAddOption !== poll.allow_add_option) {
      payload.allow_add_option = allowAddOption;
    }

    if (editedOptionLabels.length > 0) {
      payload.edited_option_labels = editedOptionLabels;
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Failed to edit poll:', error);
    }
  }, [question, allowMultiple, allowAddOption, editedOptionLabels, poll, onSubmit, onClose, t]);

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {t('pollDetail.editPoll', 'Chỉnh sửa')}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={!hasChanges || isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting
                  ? t('common.saving', 'Đang lưu...')
                  : t('common.save', 'Lưu')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Question Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('pollDetail.question', 'Câu hỏi')}
              </Text>
              <TextInput
                style={styles.questionInput}
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={3}
                placeholder={t('pollDetail.questionPlaceholder', 'Nhập câu hỏi bình chọn')}
                maxLength={500}
              />
              <Text style={styles.charCount}>
                {question.length}/500
              </Text>
            </View>

            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('pollDetail.settings', 'Cài đặt')}
              </Text>

              {/* Allow Multiple */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t('pollDetail.allowMultiple', 'Chọn nhiều đáp án')}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {t('pollDetail.allowMultipleDesc', 'Người dùng có thể chọn nhiều lựa chọn')}
                  </Text>
                  {hasVotes && (
                    <Text style={styles.settingWarning}>
                      {t('pollDetail.cannotChangeMultiple', 'Không thể thay đổi vì đã có người bình chọn')}
                    </Text>
                  )}
                </View>
                <Switch
                  value={allowMultiple}
                  onValueChange={setAllowMultiple}
                  disabled={hasVotes}
                  trackColor={{ false: '#D0D3DA', true: '#0068FF80' }}
                  thumbColor={allowMultiple ? '#0068FF' : '#FFFFFF'}
                />
              </View>

              <View style={styles.divider} />

              {/* Allow Add Option */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t('pollDetail.allowAddOption', 'Cho phép thêm đáp án')}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {t('pollDetail.allowAddOptionDesc', 'Thành viên có thể tự thêm lựa chọn')}
                  </Text>
                </View>
                <Switch
                  value={allowAddOption}
                  onValueChange={setAllowAddOption}
                  trackColor={{ false: '#D0D3DA', true: '#0068FF80' }}
                  thumbColor={allowAddOption ? '#0068FF' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Edit Options Labels */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('pollDetail.editOptions', 'Sửa lựa chọn')}
              </Text>
              {poll.options.filter((option, index, self) => 
                self.findIndex(o => o.option_id === option.option_id) === index
              ).map((option) => {
                const hasVotes = option.vote_count > 0;
                const editedLabel = editedOptionLabels.find(e => e.option_id === option.option_id)?.label;
                const currentLabel = editedLabel || option.label;

                return (
                  <View key={option.option_id} style={styles.optionEditRow}>
                    <TextInput
                      style={[
                        styles.optionEditInput,
                        hasVotes && styles.optionEditInputDisabled,
                      ]}
                      value={currentLabel}
                      onChangeText={(text) => {
                        setEditedOptionLabels(prev => {
                          const existing = prev.find(e => e.option_id === option.option_id);
                          if (existing) {
                            return prev.map(e =>
                              e.option_id === option.option_id
                                ? { ...e, label: text }
                                : e
                            );
                          }
                          return [...prev, { option_id: option.option_id, label: text }];
                        });
                      }}
                      placeholder={t('pollDetail.optionLabel', 'Nhập lựa chọn')}
                      editable={!hasVotes}
                      maxLength={200}
                    />
                    {hasVotes && (
                      <Text style={styles.optionEditNote}>
                        {t('pollDetail.hasVotes', 'Đã có bình chọn')}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Note: Cannot edit options with votes */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                {t('pollDetail.editNote', 'Lưu ý: Không thể sửa lựa chọn đã có người bình chọn.')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0068FF',
    borderRadius: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8F99',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  settingDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  settingWarning: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  noteContainer: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#F9A825',
  },
  optionEditRow: {
    marginBottom: 12,
  },
  optionEditInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000',
  },
  optionEditInputDisabled: {
    backgroundColor: '#E5E5E5',
    color: '#888',
  },
  optionEditNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});

export default EditPollModal;

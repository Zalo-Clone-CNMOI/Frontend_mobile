import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { usePollStore } from '@/src/store/usePollStore';
import { POLL_CONSTANTS } from '@/src/types/dto/PollDTO';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  onPollCreated?: (
    pollId: string,
    messageId: string,
    question: string,
    options: { option_id: string; label: string; order_index: number }[],
    metadata: any
  ) => void;
}

interface PollOption {
  id: string;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZALO_BLUE = '#0068FF';
const ZALO_BLUE_LIGHT = '#E8F2FF';

const EXPIRY_OPTIONS = [
  { value: 1,   label: '1 giờ' },
  { value: 6,   label: '6 giờ' },
  { value: 12,  label: '12 giờ' },
  { value: 24,  label: '1 ngày' },
  { value: 48,  label: '2 ngày' },
  { value: 72,  label: '3 ngày' },
  { value: 168, label: '7 ngày' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expiryLabel(hours: number): string {
  return EXPIRY_OPTIONS.find(o => o.value === hours)?.label ?? `${hours}h`;
}

function makeOption(id: string): PollOption {
  return { id, label: '' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin separator line */
function Divider() {
  return <View style={styles.divider} />;
}

/** A single option input row */
interface OptionRowProps {
  option: PollOption;
  index: number;
  showRemove: boolean;
  isMultiple: boolean;
  onChangeText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

function OptionRow({ option, index, showRemove, isMultiple, onChangeText, onRemove }: OptionRowProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.optionRow}>
      {/* Bullet: circle for single, square for multiple */}
      <View
        style={[
          styles.optionBullet,
          isMultiple && styles.optionBulletSquare,
          focused && styles.optionBulletFocused,
        ]}
      />

      <TextInput
        style={styles.optionInput}
        placeholder={`Lựa chọn ${index + 1}`}
        placeholderTextColor="#AAAAAA"
        value={option.label}
        onChangeText={text => onChangeText(option.id, text)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH}
        returnKeyType="next"
      />

      {showRemove && (
        <TouchableOpacity
          onPress={() => onRemove(option.id)}
          style={styles.optionRemoveBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.removeIcon}>
            {/* × drawn with two rotated lines */}
            <View style={[styles.removeLine, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.removeLine, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Toggle setting row */
interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

function SettingRow({ label, description, value, onValueChange, isLast }: SettingRowProps) {
  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D0D3DA', true: `${ZALO_BLUE}80` }}
        thumbColor={value ? ZALO_BLUE : '#FFFFFF'}
        ios_backgroundColor="#D0D3DA"
      />
    </View>
  );
}

/** Bottom-sheet expiry picker */
interface ExpiryPickerProps {
  visible: boolean;
  current: number;
  onSelect: (v: number) => void;
  onClose: () => void;
}

function ExpiryPicker({ visible, current, onSelect, onClose }: ExpiryPickerProps) {
  const translateY = useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
              {/* Handle bar */}
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Thời gian kết thúc</Text>
              <Divider />

              {EXPIRY_OPTIONS.map(opt => {
                const selected = opt.value === current;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
                    onPress={() => { onSelect(opt.value); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Text style={styles.sheetCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.sheetSafeArea} />
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/** Discard confirmation dialog */
interface DiscardDialogProps {
  visible: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

function DiscardDialog({ visible, onKeep, onDiscard }: DiscardDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onKeep}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogBox}>
          <View style={styles.dialogBody}>
            <Text style={styles.dialogTitle}>Hủy bình chọn?</Text>
            <Text style={styles.dialogMsg}>
              Nội dung bạn đã nhập sẽ bị xóa và không thể khôi phục.
            </Text>
          </View>
          <Divider />
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onKeep} activeOpacity={0.7}>
              <Text style={styles.dialogBtnKeep}>Tiếp tục</Text>
            </TouchableOpacity>
            <View style={styles.dialogBtnDivider} />
            <TouchableOpacity style={styles.dialogBtn} onPress={onDiscard} activeOpacity={0.7}>
              <Text style={styles.dialogBtnDiscard}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreatePollModal({
  visible,
  onClose,
  conversationId,
  onPollCreated,
}: CreatePollModalProps) {
  const { t } = useTranslation();
  const { createPoll, isCreating } = usePollStore();

  // Form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    makeOption('1'),
    makeOption('2'),
  ]);
  const [allowMultiple, setAllowMultiple]   = useState(false);
  const [allowAddOption, setAllowAddOption] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);

  // UI state
  const [showExpiry, setShowExpiry]   = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const nextId = useRef(3);

  // ── Derived ────────────────────────────────────────────────────────────────

  const validOptions   = options.filter(o => o.label.trim());
  const isFormValid    = question.trim().length > 0 && validOptions.length >= POLL_CONSTANTS.MIN_OPTIONS;
  const canAddOption   = options.length < POLL_CONSTANTS.MAX_OPTIONS;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setQuestion('');
    setOptions([makeOption('1'), makeOption('2')]);
    setAllowMultiple(false);
    setAllowAddOption(false);
    setExpiresInHours(24);
    nextId.current = 3;
  }, []);

  const handleClose = useCallback(() => {
    if (question.trim() || options.some(o => o.label.trim())) {
      Keyboard.dismiss();
      setShowDiscard(true);
    } else {
      onClose();
    }
  }, [question, options, onClose]);

  const handleDiscard = useCallback(() => {
    setShowDiscard(false);
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const addOption = useCallback(() => {
    if (!canAddOption) return;
    const id = String(nextId.current++);
    setOptions(prev => [...prev, makeOption(id)]);
  }, [canAddOption]);

  const removeOption = useCallback((id: string) => {
    if (options.length <= POLL_CONSTANTS.MIN_OPTIONS) return;
    setOptions(prev => prev.filter(o => o.id !== id));
  }, [options.length]);

  const updateOption = useCallback((id: string, label: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
  }, []);

  const validate = useCallback((): string | null => {
    if (!question.trim()) return 'Vui lòng nhập câu hỏi bình chọn';
    if (question.length > POLL_CONSTANTS.MAX_QUESTION_LENGTH)
      return `Câu hỏi tối đa ${POLL_CONSTANTS.MAX_QUESTION_LENGTH} ký tự`;

    const valid = options.filter(o => o.label.trim());
    if (valid.length < POLL_CONSTANTS.MIN_OPTIONS)
      return `Cần ít nhất ${POLL_CONSTANTS.MIN_OPTIONS} lựa chọn`;

    const labels = valid.map(o => o.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length)
      return 'Các lựa chọn không được trùng nhau';

    for (const opt of valid) {
      if (opt.label.length > POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH)
        return `Mỗi lựa chọn tối đa ${POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH} ký tự`;
    }
    return null;
  }, [question, options]);

  const handleCreate = useCallback(async () => {
    const error = validate();
    if (error) {
      Alert.alert('Lỗi', error);
      return;
    }
    try {
      const validOptions = options.filter(o => o.label.trim());
      const result = await createPoll(conversationId, {
        question: question.trim(),
        options: validOptions.map(o => ({ label: o.label.trim() })),
        allow_multiple:   allowMultiple,
        allow_add_option: allowAddOption,
        expires_in_hours: expiresInHours,
      });
      
      // Build options with generated IDs (server will provide real IDs via WebSocket)
      const optionsWithIds = validOptions.map((o, idx) => ({
        option_id: `opt_${idx}_${Date.now()}`,
        label: o.label,
        order_index: idx,
      }));
      
      // Build poll metadata for optimistic update
      const pollMetadata = {
        poll_id: result.pollId,
        question: question.trim(),
        options: optionsWithIds.map((o: any) => ({
          option_id: o.option_id,
          label: o.label,
          order_index: o.order_index,
          vote_count: 0,
        })),
        total_votes: 0,
        total_voters: 0,
        allow_multiple: allowMultiple,
        allow_add_option: allowAddOption,
        status: 'active' as const,
        expires_at: expiresInHours ? Date.now() + expiresInHours * 3600000 : null,
        closed_at: null,
        closed_reason: null,
      };
      
      onPollCreated?.(
        result.pollId,
        result.messageId,
        question.trim(),
        optionsWithIds,
        pollMetadata
      );
      resetForm();
      onClose();
    } catch (err: any) {
      // Extract error message safely
      let message = 'Không thể tạo bình chọn. Vui lòng thử lại sau.';

      if (err?.status === 404) {
        message = 'Tính năng bình chọn chưa được hỗ trợ trên hệ thống.';
      } else if (err?.status === 500) {
        message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
      } else if (typeof err?.message === 'string') {
        // If error message is too long or looks like JSON, simplify it
        const errMsg = err.message;
        if (errMsg.length > 100 || errMsg.startsWith('{')) {
          message = 'Không thể tạo bình chọn. Vui lòng thử lại sau.';
        } else {
          message = errMsg;
        }
      }

      Alert.alert('Lỗi', message);
    }
  }, [
    validate, createPoll, conversationId, question, options,
    allowMultiple, allowAddOption, expiresInHours,
    onPollCreated, resetForm, onClose,
  ]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {/* Back arrow */}
            <View style={styles.arrowIcon}>
              <View style={[styles.arrowLine, { transform: [{ rotate: '-45deg' }, { translateY: 4 }] }]} />
              <View style={[styles.arrowLine, { transform: [{ rotate: '45deg' }, { translateY: -4 }] }]} />
            </View>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tạo bình chọn</Text>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={!isFormValid || isCreating}
            style={styles.headerIconBtn}
          >
            <Text style={[styles.createBtnText, (!isFormValid || isCreating) && styles.createBtnTextDisabled]}>
              TẠO
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Question ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>CÂU HỎI</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Bạn muốn hỏi gì?"
              placeholderTextColor="#AAAAAA"
              value={question}
              onChangeText={setQuestion}
              maxLength={POLL_CONSTANTS.MAX_QUESTION_LENGTH}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{question.length}/{POLL_CONSTANTS.MAX_QUESTION_LENGTH}</Text>
          </View>

          {/* ── Options ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>LỰA CHỌN</Text>

            {options.map((opt, i) => (
              <React.Fragment key={opt.id}>
                {i > 0 && <Divider />}
                <OptionRow
                  option={opt}
                  index={i}
                  showRemove={options.length > POLL_CONSTANTS.MIN_OPTIONS}
                  isMultiple={allowMultiple}
                  onChangeText={updateOption}
                  onRemove={removeOption}
                />
              </React.Fragment>
            ))}

            {canAddOption && (
              <>
                <Divider />
                <TouchableOpacity style={styles.addOptionRow} onPress={addOption} activeOpacity={0.7}>
                  <View style={styles.addIconCircle}>
                    {/* + icon */}
                    <View style={styles.addPlusH} />
                    <View style={styles.addPlusV} />
                  </View>
                  <Text style={styles.addOptionText}>Thêm lựa chọn</Text>
                  <Text style={styles.optionCountText}>{options.length}/{POLL_CONSTANTS.MAX_OPTIONS}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Settings ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>CÀI ĐẶT</Text>

            <SettingRow
              label="Chọn nhiều đáp án"
              description="Người dùng có thể chọn nhiều lựa chọn"
              value={allowMultiple}
              onValueChange={setAllowMultiple}
            />
            <Divider />
            <SettingRow
              label="Cho phép thêm đáp án"
              description="Thành viên có thể tự thêm lựa chọn"
              value={allowAddOption}
              onValueChange={setAllowAddOption}
            />
            <Divider />

            {/* Expiry — tappable row */}
            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => setShowExpiry(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Thời gian kết thúc</Text>
              </View>
              <View style={styles.expiryPill}>
                <Text style={styles.expiryPillText}>{expiryLabel(expiresInHours)}</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>

      {/* ── Expiry bottom-sheet ── */}
      <ExpiryPicker
        visible={showExpiry}
        current={expiresInHours}
        onSelect={setExpiresInHours}
        onClose={() => setShowExpiry(false)}
      />

      {/* ── Discard confirm dialog ── */}
      <DiscardDialog
        visible={showDiscard}
        onKeep={() => setShowDiscard(false)}
        onDiscard={handleDiscard}
      />
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F3F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E6E9',
  },
  headerIconBtn: {
    padding: 4,
    minWidth: 44,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  arrowIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
  },
  arrowLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#111111',
    borderRadius: 1,
    left: 2,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: ZALO_BLUE,
    textAlign: 'right',
  },
  createBtnTextDisabled: {
    opacity: 0.35,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 10, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8F99',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Question
  questionInput: {
    fontSize: 15,
    color: '#111111',
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 72,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: '#E8E9EC',
    marginHorizontal: 16,
  },

  // Option row
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
    minHeight: 48,
  },
  optionBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D0D3DA',
    flexShrink: 0,
  },
  optionBulletSquare: {
    borderRadius: 4,
  },
  optionBulletFocused: {
    borderColor: ZALO_BLUE,
  },
  optionInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    paddingVertical: 12,
  },
  optionRemoveBtn: {
    padding: 4,
  },
  removeIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLine: {
    position: 'absolute',
    width: 12,
    height: 1.5,
    backgroundColor: '#AAAAAA',
    borderRadius: 1,
  },

  // Add option
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  addIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ZALO_BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlusH: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    backgroundColor: ZALO_BLUE,
    borderRadius: 1,
  },
  addPlusV: {
    position: 'absolute',
    width: 1.5,
    height: 10,
    backgroundColor: ZALO_BLUE,
    borderRadius: 1,
  },
  addOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: ZALO_BLUE,
  },
  optionCountText: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settingRowLast: {},
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
  },
  settingDesc: {
    fontSize: 12,
    color: '#8A8F99',
    marginTop: 2,
  },

  // Expiry pill
  expiryPill: {
    backgroundColor: ZALO_BLUE_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  expiryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ZALO_BLUE,
  },

  // Bottom sheet (expiry picker)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D0D3DA',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F1F3',
  },
  sheetOptionSelected: {
    backgroundColor: ZALO_BLUE_LIGHT,
  },
  sheetOptionText: {
    fontSize: 15,
    color: '#333333',
  },
  sheetOptionTextSelected: {
    color: ZALO_BLUE,
    fontWeight: '600',
  },
  sheetCheck: {
    fontSize: 15,
    fontWeight: '700',
    color: ZALO_BLUE,
  },
  sheetSafeArea: { height: 20 },

  // Discard dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialogBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  dialogBody: {
    padding: 20,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  dialogMsg: {
    fontSize: 13,
    color: '#8A8F99',
    textAlign: 'center',
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  dialogBtnDivider: {
    width: 0.5,
    backgroundColor: '#E4E6E9',
  },
  dialogBtnKeep: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
  },
  dialogBtnDiscard: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E53935',
  },
});

export default CreatePollModal;
import { translationService } from '@/src/services/ai/TranslationService';
import { useAITranslationStore } from '@/src/store/useAITranslationStore';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { LANGUAGES, type Language } from '@/src/constants/languages';
import { ArrowLeft, Check, ChevronDown, Languages } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TranslationModalProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
}

export function TranslationModal({ visible, message, onClose }: TranslationModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [targetLanguage, setTargetLanguage] = useState('vi');
  const [showPicker, setShowPicker] = useState(false);
  const prevMessageIdRef = useRef<string | null>(null);

  // Primitive fields so effects depend on stable values, not the message object
  // identity (which can change on unrelated parent re-renders).
  const messageId = message?.id ?? '';
  const conversationId = message?.conversationId ?? '';
  const messageText = message?.text ?? '';

  const cacheKey = message ? `${messageId}_${targetLanguage}` : '';
  const cachedEntry = useAITranslationStore((s) => s.cache.get(cacheKey));
  // Loading + error are owned by the store (set by TranslationService), so they
  // survive a result arriving via the socket handler and never get stuck.
  const isTranslating = useAITranslationStore((s) => s.isLoading(messageId, targetLanguage));
  const translateError = useAITranslationStore((s) => s.getError(messageId, targetLanguage));

  const hasResult = !!cachedEntry && messageText === cachedEntry.original;

  const selectedLang = LANGUAGES.find((l) => l.code === targetLanguage) || LANGUAGES[0];

  useEffect(() => {
    if (visible && message) {
      if (prevMessageIdRef.current !== message.id) {
        setTargetLanguage('vi');
        setShowPicker(false);
        prevMessageIdRef.current = message.id;
      }
    }
  }, [visible, message]);

  useEffect(() => {
    if (!visible || !messageId) return;
    if (hasResult) return;
    const cached = translationService.getCachedTranslation(messageId, targetLanguage);
    if (cached) return;
    const store = useAITranslationStore.getState();
    // Don't auto-(re)request while one is in flight or after a failure; the user
    // retries explicitly via the retry button so we never loop on errors.
    if (store.isLoading(messageId, targetLanguage) || store.getError(messageId, targetLanguage)) return;
    translationService.requestTranslation({
      conversationId,
      userId: '',
      messageId,
      body: messageText,
      targetLanguage,
    });
  }, [targetLanguage, messageId, conversationId, messageText, visible, hasResult]);

  const handleSelectLanguage = useCallback((lang: Language) => {
    setTargetLanguage(lang.code);
    setShowPicker(false);
  }, []);

  const handleRetry = useCallback(() => {
    if (!messageId) return;
    // requestTranslation resets loading=true + error=null on entry.
    translationService.requestTranslation({
      conversationId,
      userId: '',
      messageId,
      body: messageText,
      targetLanguage,
    });
  }, [messageId, conversationId, messageText, targetLanguage]);

  if (!message) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {t('ai.translate', { defaultValue: 'Dịch tin nhắn' })}
            </Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.content}>
            <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
              {t('ai.original_text', { defaultValue: 'Nội dung gốc' })}
            </Text>
            <View style={[styles.sourceBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sourceText, { color: theme.colors.text }]} selectable>
                {message.text}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
              {t('ai.target_language', { defaultValue: 'Ngôn ngữ đích' })}
            </Text>

            <TouchableOpacity
              style={[styles.languageSelector, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => setShowPicker(!showPicker)}
            >
              <Languages size={20} color={theme.colors.primary} />
              <Text style={[styles.languageSelectorText, { color: theme.colors.text }]}>
                {selectedLang.nativeName}
              </Text>
              <ChevronDown size={20} color={theme.colors.muted} />
            </TouchableOpacity>

            {showPicker && (
              <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <FlatList
                  data={LANGUAGES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item.code === targetLanguage && { backgroundColor: theme.colors.primary + '20' }]}
                      onPress={() => handleSelectLanguage(item)}
                    >
                      <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                        {item.nativeName}
                      </Text>
                      <Text style={[styles.pickerItemSub, { color: theme.colors.muted }]}>
                        {item.name}
                      </Text>
                      {item.code === targetLanguage && (
                        <Check size={18} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.pickerList}
                />
              </View>
            )}

            {isTranslating && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
                  {t('ai.translating', { defaultValue: 'Đang dịch...' })}
                </Text>
              </View>
            )}

            {!isTranslating && !!translateError && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {translateError}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { borderColor: theme.colors.primary }]}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel={t('ai.translate.retry', { defaultValue: 'Thử lại' })}
                >
                  <Text style={[styles.retryButtonText, { color: theme.colors.primary }]}>
                    {t('ai.translate.retry', { defaultValue: 'Thử lại' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {hasResult && !isTranslating && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
                  {t('ai.translated_result', { defaultValue: 'Kết quả' })}
                </Text>
                <View style={[styles.resultBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.resultText, { color: theme.colors.text }]} selectable>
                    {cachedEntry?.translated}
                  </Text>
                  <Text style={[styles.providerLabel, { color: theme.colors.muted }]}>
                    {t('ai.translated_by_ai', { defaultValue: 'Đã dịch qua AI' })}
                  </Text>
                </View>
              </>
            )}
          </View>
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
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  sourceText: {
    fontSize: 16,
    lineHeight: 22,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  languageSelectorText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 260,
  },
  pickerList: {
    maxHeight: 260,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  pickerItemSub: {
    fontSize: 13,
    marginRight: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 22,
  },
  providerLabel: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'right',
    fontStyle: 'italic',
  },
});
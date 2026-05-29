import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import { useAISummaryStore } from '@/src/store/useAISummaryStore';
import { X, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface SummaryModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

export function SummaryModal({ visible, conversationId, onClose }: SummaryModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const summaries = useAISummaryStore((state) => state.summaries);
  const loadingByConversation = useAISummaryStore((state) => state.loadingByConversation);
  const errorByConversation = useAISummaryStore((state) => state.errorByConversation);

  const safeConversationId = conversationId || '';
  const summary = summaries.get(safeConversationId);
  const isLoading = loadingByConversation.get(safeConversationId) || false;
  const error = errorByConversation.get(safeConversationId) || null;

  const handleCopy = async () => {
    if (summary?.summary) {
      await Clipboard.setStringAsync(summary.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              AI Summary
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
                  Generating summary...
                </Text>
              </View>
            )}

            {error && !isLoading && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: '#ef4444' }]}>
                  {error}
                </Text>
              </View>
            )}

            {summary?.summary && !isLoading && (
              <>
                <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                  {summary.summary}
                </Text>
                {summary.cachedAt && (
                  <Text style={[styles.updatedAt, { color: theme.colors.icon }]}>
                    {t('summary.updated_at', { defaultValue: 'Updated' })}:{' '}
                    {new Date(summary.cachedAt).toLocaleString()}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.copyBtn, { borderColor: theme.colors.border }]}
                  onPress={handleCopy}
                >
                  {copied ? (
                    <Check size={16} color={theme.colors.primary} />
                  ) : (
                    <Copy size={16} color={theme.colors.icon} />
                  )}
                  <Text style={[styles.copyText, { color: theme.colors.icon }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    minHeight: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  copyText: {
    fontSize: 14,
  },
  updatedAt: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
});

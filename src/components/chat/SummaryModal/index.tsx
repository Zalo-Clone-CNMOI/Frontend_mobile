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
  const [expanded, setExpanded] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const summaries = useAISummaryStore((state) => state.summaries);
  const loadingByConversation = useAISummaryStore((state) => state.loadingByConversation);
  const errorByConversation = useAISummaryStore((state) => state.errorByConversation);

  const safeConversationId = conversationId || '';
  const summary = summaries.get(safeConversationId);
  const isLoading = loadingByConversation.get(safeConversationId) || false;
  const error = errorByConversation.get(safeConversationId) || null;

  // RN Modal keeps its subtree mounted when hidden, so `copied` would otherwise
  // persist a stale "Copied!" across opens. Reset it whenever the modal opens
  // or switches conversation. Also clear any pending reset timer on unmount.
  React.useEffect(() => {
    if (visible) setCopied(false);
  }, [visible, conversationId]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (summary?.summary) {
      await Clipboard.setStringAsync(summary.summary);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
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
              {t('ai.summary.title', { defaultValue: 'Tóm tắt AI' })}
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
                  {t('ai.summary.generating', { defaultValue: 'Đang tạo tóm tắt...' })}
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

            {/* No-unread / empty state: a cache entry exists (catch-up resolved)
                but there is no summary text → nothing to catch up on. */}
            {summary && !summary.summary && !isLoading && !error && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
                  {t('ai.summary.noUnread', {
                    defaultValue: 'Bạn đã đọc hết tin nhắn rồi 🎉',
                  })}
                </Text>
              </View>
            )}

            {summary?.summary && !isLoading && (
              <>
                <Text
                  style={[styles.summaryText, { color: theme.colors.text }]}
                  numberOfLines={expanded ? undefined : 8}
                  ellipsizeMode="tail"
                >
                  {summary.summary}
                </Text>
                {summary.summary.length > 200 && (
                  <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
                    <Text style={[styles.expandText, { color: theme.colors.primary }]}>
                      {expanded
                        ? t('ai.summary.collapse', { defaultValue: 'Thu gọn' })
                        : t('ai.summary.expand', { defaultValue: 'Xem thêm' })}
                    </Text>
                  </TouchableOpacity>
                )}
                {summary.cachedAt && (
                  <Text style={[styles.updatedAt, { color: theme.colors.icon }]}>
                    {t('ai.summary.updatedAt', { defaultValue: 'Cập nhật' })}:{' '}
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
                    {copied
                      ? t('ai.summary.copied', { defaultValue: 'Đã sao chép!' })
                      : t('ai.summary.copy', { defaultValue: 'Sao chép' })}
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
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  expandBtn: {
    marginTop: 4,
    marginBottom: 4,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
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

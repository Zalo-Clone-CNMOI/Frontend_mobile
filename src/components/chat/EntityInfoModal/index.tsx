import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import { DetectedEntity } from '@/src/store/useEntityDetectionStore';
import { getEntityColor } from '@/src/constants/entityColors';
import { getEntityInfo } from '@/src/services/ai/entityInfoApi';
import type { EntityInfoLang } from '@/src/services/ai/entityInfo.types';
import { entityInfoKey, useEntityInfoStore } from '@/src/store/useEntityInfoStore';
import { X, Building2, User, Lightbulb, MapPin, ShoppingBag, HelpCircle } from 'lucide-react-native';

interface EntityInfoModalProps {
  visible: boolean;
  entity: DetectedEntity | null;
  onClose: () => void;
}

const entityIcons = {
  tool: Lightbulb,
  company: Building2,
  person: User,
  concept: Lightbulb,
  location: MapPin,
  product: ShoppingBag,
  other: HelpCircle,
};

export function EntityInfoModal({ visible, entity, onClose }: EntityInfoModalProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  // Derived primitives (not the entity object) so effects depend on stable values.
  const lang: EntityInfoLang = i18n.language === 'en' ? 'en' : 'vi';
  const entityText = entity?.text ?? '';
  const entityType = entity?.type ?? 'other';
  const key = entity ? entityInfoKey(entityType, entityText, lang) : '';

  const info = useEntityInfoStore((s) => (key ? s.get(key) : null));
  const isLoadingInfo = useEntityInfoStore((s) => (key ? s.isLoading(key) : false));
  const infoError = useEntityInfoStore((s) => (key ? s.getError(key) : null));

  const loadEntityInfo = useCallback(async () => {
    if (!key) return;
    const store = useEntityInfoStore.getState();
    store.setLoading(key, true);
    store.setError(key, null);
    try {
      const result = await getEntityInfo(entityText, entityType, lang);
      // set() also clears loading + error for this key.
      useEntityInfoStore.getState().set(key, result);
    } catch (e) {
      const msg = e instanceof Error
        ? e.message
        : t('ai.entity.loadError', { defaultValue: 'Không thể tải thông tin. Vui lòng thử lại.' });
      const s = useEntityInfoStore.getState();
      s.setError(key, msg);
      s.setLoading(key, false);
    }
  }, [key, entityText, entityType, lang, t]);

  useEffect(() => {
    if (!visible || !key) return;
    const store = useEntityInfoStore.getState();
    if (store.get(key)) return; // fresh cache hit — don't refetch within TTL
    // Don't auto-(re)fetch while in flight or after a failure; retry is explicit.
    if (store.isLoading(key) || store.getError(key)) return;
    void loadEntityInfo();
  }, [visible, key, loadEntityInfo]);

  if (!entity) return null;

  const IconComponent = entityIcons[entity.type] || HelpCircle;
  // Single source of truth so the modal icon matches the message-highlight dots.
  const color = getEntityColor(entity.type);

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
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <IconComponent size={24} color={color} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={[styles.textContainer, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.entityText, { color: theme.colors.text }]}>
                {entity.text}
              </Text>
            </View>

            {isLoadingInfo && (
              <View style={styles.infoLoading}>
                <ActivityIndicator color={color} />
                <Text style={[styles.infoLoadingText, { color: theme.colors.muted }]}>
                  {t('ai.entity.loading', { defaultValue: 'Đang tải thông tin...' })}
                </Text>
              </View>
            )}

            {!isLoadingInfo && !!infoError && (
              <View style={styles.infoError}>
                <Text style={[styles.infoErrorText, { color: theme.colors.error }]}>
                  {infoError}
                </Text>
                <TouchableOpacity
                  onPress={loadEntityInfo}
                  accessibilityRole="button"
                  accessibilityLabel={t('ai.entity.retry', { defaultValue: 'Thử lại' })}
                  style={[styles.retryBtn, { borderColor: color }]}
                >
                  <Text style={[styles.retryBtnText, { color }]}>
                    {t('ai.entity.retry', { defaultValue: 'Thử lại' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isLoadingInfo && !infoError && info && (
              <View style={styles.panel}>
                {!!info.title && (
                  <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
                    {info.title}
                  </Text>
                )}
                {!!info.summary && (
                  <Text style={[styles.panelSummary, { color: theme.colors.text }]}>
                    {info.summary}
                  </Text>
                )}
                {!!info.details && (
                  <Text style={[styles.panelDetails, { color: theme.colors.icon }]}>
                    {info.details}
                  </Text>
                )}
                {!!info.related_entities?.length && (
                  <View style={styles.relatedWrap}>
                    <Text style={[styles.relatedLabel, { color: theme.colors.muted }]}>
                      {t('ai.entity.related', { defaultValue: 'Liên quan' })}
                    </Text>
                    <View style={styles.chips}>
                      {info.related_entities.map((rel, idx) => (
                        <View key={`${rel}-${idx}`} style={[styles.chip, { backgroundColor: color + '20' }]}>
                          <Text style={[styles.chipText, { color }]}>{rel}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.icon }]}>
                {t('ai.entity.confidence', { defaultValue: 'Độ tin cậy' })}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {Math.round(entity.confidence * 100)}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.icon }]}>
                {t('ai.entity.position', { defaultValue: 'Vị trí' })}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {entity.start_index} - {entity.end_index}
              </Text>
            </View>
          </ScrollView>
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
    maxHeight: '60%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    minHeight: 100,
  },
  textContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  entityText: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoLoading: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  infoLoadingText: {
    fontSize: 13,
  },
  infoError: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  infoErrorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    marginBottom: 16,
    gap: 8,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  panelSummary: {
    fontSize: 15,
    lineHeight: 21,
  },
  panelDetails: {
    fontSize: 14,
    lineHeight: 20,
  },
  relatedWrap: {
    marginTop: 4,
    gap: 6,
  },
  relatedLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
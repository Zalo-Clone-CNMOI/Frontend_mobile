import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { DetectedEntity } from '@/src/store/useEntityDetectionStore';
import { getEntityColor } from '@/src/constants/entityColors';
import { X, Globe, Building2, User, Lightbulb, MapPin, ShoppingBag, HelpCircle } from 'lucide-react-native';

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

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.icon }]}>
                Confidence
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {Math.round(entity.confidence * 100)}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.icon }]}>
                Position
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
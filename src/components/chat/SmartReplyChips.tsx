import { useTheme } from '@/src/theme/themeContext';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAISmartReplyStore } from '../../store/useAISmartReplyStore';

interface SmartReplyChipsProps {
  conversationId: string;
  userId: string;
  onSelect: (suggestion: string) => void;
  onDismiss: () => void;
}

export const SmartReplyChips: React.FC<SmartReplyChipsProps> = ({
  conversationId,
  userId,
  onSelect,
  onDismiss,
}) => {
  const theme = useTheme();
  const suggestions = useAISmartReplyStore((state) => state.suggestions.get(conversationId)) ?? [];
  const isLoading = useAISmartReplyStore((state) => state.loadingByConversation.get(conversationId)) ?? false;
  const displaySuggestions = suggestions.slice(0, 3).map((s) =>
    s.length > 80 ? s.slice(0, 77) + '...' : s
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.skeletonChip, { backgroundColor: theme.colors.primary + '12' }]} />
          <View style={[styles.skeletonChip, { backgroundColor: theme.colors.primary + '12' }]} />
          <View style={[styles.skeletonChip, { backgroundColor: theme.colors.primary + '12' }]} />
        </View>
      </View>
    );
  }

  if (displaySuggestions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
          <Sparkles size={13} color={theme.colors.primary} />
        </View>
        <Text style={[styles.label, { color: theme.colors.icon }]}>Gợi ý</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: theme.colors.icon }]}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {displaySuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`${suggestion}-${index}`}
            style={[
              styles.chip,
              { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '25' },
            ]}
            onPress={() => onSelect(suggestion)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.chipText, { color: theme?.colors?.primary || '#007AFF' }]}
              numberOfLines={1}
            >
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dismissText: {
    fontSize: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  skeletonChip: {
    width: 100,
    height: 36,
    borderRadius: 18,
  },
});

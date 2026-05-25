import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { DocumentSource } from '@/src/store/useAIDocumentStore';

interface SourceCitationProps {
  source: DocumentSource;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SourceCitation({ source, index, isExpanded, onToggle }: SourceCitationProps) {
  const theme = useTheme();

  const similarity = source.similarity ?? 0;
  const percentage = Math.round(similarity * 100);

  const getSimilarityColor = () => {
    if (similarity >= 0.8) return theme.colors.success;
    if (similarity >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const similarityColor = getSimilarityColor();

  const chunkLabel = source.chunk_index !== undefined ? `#${source.chunk_index + 1}` : `#${index + 1}`;
  const previewText = source.text?.slice(0, 120) || '';
  const hasMore = (source.text?.length || 0) > 120;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.background },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.chunkBadge, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={[styles.chunkText, { color: theme.colors.primary }]}>
              Chunk {chunkLabel}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.matchBadge, { backgroundColor: similarityColor + '20' }]}>
            <View style={[styles.matchDot, { backgroundColor: similarityColor }]} />
            <Text style={[styles.matchText, { color: similarityColor }]}>
              {percentage}% match
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.contentRow}>
        <Text
          style={[styles.previewText, { color: theme.colors.text }]}
          numberOfLines={isExpanded ? undefined : 2}
        >
          {isExpanded ? source.text : previewText}
          {!isExpanded && hasMore && '...'}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: similarityColor, width: `${percentage}%` },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chunkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chunkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentRow: {
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
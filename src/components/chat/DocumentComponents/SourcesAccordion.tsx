import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react-native';
import { SourceCitation } from './SourceCitation';
import type { DocumentSource } from '@/src/store/useAIDocumentStore';

interface SourcesAccordionProps {
  sources: DocumentSource[];
  defaultExpanded?: boolean;
}

export function SourcesAccordion({ sources, defaultExpanded = true }: SourcesAccordionProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (sources.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: theme.colors.primary + '08' },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.headerLeft}>
          <BookOpen size={14} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
            Sources
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.countText, { color: theme.colors.primary }]}>
              {sources.length}
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={16} color={theme.colors.primary} />
        ) : (
          <ChevronDown size={16} color={theme.colors.primary} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.sourcesList}>
          {sources.map((source, idx) => (
            <SourceCitation
              key={`${source.chunk_index ?? idx}-${idx}`}
              source={source}
              index={idx}
              isExpanded={false}
              onToggle={() => {}}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sourcesList: {
    marginTop: 10,
  },
});
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { Bot, User, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { SourcesAccordion } from './SourcesAccordion';
import type { DocumentSource } from '@/src/store/useAIDocumentStore';

interface ResponseBubbleProps {
  query: string;
  answer: string;
  sources: DocumentSource[];
  timestamp?: number;
}

export function ResponseBubble({ query, answer, sources, timestamp }: ResponseBubbleProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* User Query */}
      <View style={styles.queryRow}>
        <View style={[styles.avatarBox, { backgroundColor: theme.colors.primary }]}>
          <User size={14} color="#fff" />
        </View>
        <View style={[styles.queryBubble, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.queryText}>{query}</Text>
        </View>
      </View>

      {/* AI Response */}
      <View style={styles.responseRow}>
        <View style={[styles.avatarBox, { backgroundColor: theme.colors.card }]}>
          <Bot size={14} color={theme.colors.primary} />
        </View>
        <View style={[styles.responseBubble, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.responseText, { color: theme.colors.text }]}>{answer}</Text>

          {sources.length > 0 && (
            <SourcesAccordion sources={sources} defaultExpanded={true} />
          )}

          <View style={styles.responseFooter}>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              {copied ? (
                <>
                  <Check size={12} color="#10b981" />
                  <Text style={[styles.copyText, { color: '#10b981' }]}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={12} color={theme.colors.icon} />
                  <Text style={[styles.copyText, { color: theme.colors.icon }]}>Copy</Text>
                </>
              )}
            </Pressable>
            {timestamp && (
              <Text style={[styles.timeText, { color: theme.colors.icon }]}>
                {formatTime(timestamp)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  queryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  queryText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  responseBubble: {
    flex: 1,
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 22,
  },
  responseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
  },
});
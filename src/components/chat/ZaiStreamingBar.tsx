import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Square } from 'lucide-react-native';
import { TypingIndicator } from './TypingIndicator';

interface ZaiStreamingBarProps {
  /** Accumulated streamed text so far. Null/empty → show the "typing" label. */
  text: string | null;
  /** Color for the streamed text (pass theme.colors.text). */
  textColor?: string;
  /** Called when the user taps Stop to cancel the in-flight stream. */
  onStop: () => void;
}

/**
 * Bar shown above the composer while Zai is streaming a reply (Issue #4).
 *
 * Renders the live, token-by-token text as it accumulates in useZaiChatStore;
 * before the first chunk arrives it falls back to a "Zai đang trả lời..."
 * typing indicator. The parent renders this ONLY while the stream is active, so
 * it disappears on completion and the final persisted message (which arrives via
 * the normal chat:message path) remains in the list — no duplicate bubble.
 */
export function ZaiStreamingBar({
  text,
  textColor = '#000',
  onStop,
}: ZaiStreamingBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const hasText = !!text && text.length > 0;

  return (
    <View style={styles.streamingBar}>
      <View style={styles.streamingInfo}>
        {hasText ? (
          <ScrollView
            ref={scrollRef}
            style={styles.textScroll}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            <Text style={[styles.text, { color: textColor }]}>{text}</Text>
          </ScrollView>
        ) : (
          <TypingIndicator text="Zai đang trả lời..." />
        )}
      </View>
      <TouchableOpacity
        style={styles.stopButton}
        onPress={onStop}
        accessibilityRole="button"
        accessibilityLabel="Dừng Zai"
      >
        <Square size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  streamingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  streamingInfo: {
    flex: 1,
  },
  textScroll: {
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  stopButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});

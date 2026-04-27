import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onReactionPress: (reactionType: string) => void;
  isAbsolute?: boolean;
  isMe?: boolean;
}

const getReactionEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    love: '❤️',
    like: '👍',
    haha: '😂',
    wow: '😲',
    sad: '😢',
    angry: '😡',
  };
  return emojis[type] || '❓';
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onReactionPress,
  isAbsolute = false,
  isMe = false,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  const reactionPillBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const reactionPillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const reactionPillActiveBg = isDark ? '#0A2A55' : '#E5F4FF';
  const reactionPillActiveBorder = theme.colors.primary;
  const reactionCountColor = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';

  const containerStyle = isAbsolute
    ? [styles.reactionsContainer, isMe ? styles.reactionsRight : styles.reactionsLeft]
    : styles.reactionsInline;

  return (
    <View style={containerStyle}>
      {Object.entries(reactions).map(([reactionType, userIds]) => {
        const hasMyReaction = userIds.includes(currentUserId);
        const emoji = getReactionEmoji(reactionType);
        return (
          <TouchableOpacity
            key={reactionType}
            style={[
              styles.reactionPill,
              {
                backgroundColor: reactionPillBg,
                borderColor: reactionPillBorder,
              },
              hasMyReaction && {
                backgroundColor: reactionPillActiveBg,
                borderColor: reactionPillActiveBorder,
              },
            ]}
            onPress={() => hasMyReaction && onReactionPress(reactionType)}
          >
            <Text style={styles.reactionPillEmoji}>{emoji}</Text>
            {userIds.length > 1 && (
              <Text style={[styles.reactionPillCount, { color: reactionCountColor }]}>
                {userIds.length}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  reactionsContainer: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    gap: 4,
  },
  reactionsRight: { right: -10 },
  reactionsLeft: { left: -10 },
  reactionsInline: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0.5,
  },
  reactionPillEmoji: { fontSize: 13 },
  reactionPillCount: { fontSize: 11, fontWeight: '600' },
});

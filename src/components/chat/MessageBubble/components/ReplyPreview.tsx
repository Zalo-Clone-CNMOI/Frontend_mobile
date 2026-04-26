import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import type { ReplyInfo } from '@/src/types/chat';

interface ReplyPreviewProps {
  replyTo: ReplyInfo;
  isMe: boolean;
  myTextColor: string;
  theirTextColor: string;
  onPress: () => void;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyTo,
  isMe,
  myTextColor,
  theirTextColor,
  onPress,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const replySenderName = replyTo.senderName || t('messages.replying_to');
  const replyText =
    String(replyTo.text || '').trim() ||
    t('messages.replied_message', { defaultValue: t('chat.reply') });

  const myReplyOverlayBg = 'rgba(255,255,255,0.12)';
  const theirReplyOverlayBg = theme.dark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.05)';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.replyWrap,
        {
          backgroundColor: isMe ? myReplyOverlayBg : theirReplyOverlayBg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[styles.replyBar, { backgroundColor: theme.colors.primary }]}
      />
      <View style={styles.replyContent}>
        <Text
          style={[
            styles.replyName,
            { color: isMe ? myTextColor : theme.colors.primary },
          ]}
          numberOfLines={1}
        >
          {replySenderName}
        </Text>
        <Text
          style={[
            styles.replyText,
            { color: isMe ? myTextColor : theirTextColor, opacity: 0.7 },
          ]}
          numberOfLines={1}
        >
          {replyText}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  replyWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  replyBar: { width: 3 },
  replyContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  replyName: { fontSize: 12, fontWeight: '700' },
  replyText: { fontSize: 12, marginTop: 1 },
});

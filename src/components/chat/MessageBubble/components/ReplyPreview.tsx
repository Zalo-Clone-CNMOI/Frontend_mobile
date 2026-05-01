import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage, ReplyInfo } from '@/src/types/chat';
import { FileVideo, Image as ImageIcon } from 'lucide-react-native';

interface ReplyPreviewProps {
  replyTo: ReplyInfo;
  isMe: boolean;
  myTextColor: string;
  theirTextColor: string;
  onPress: () => void;
  messages?: ChatMessage[]; // For lookup original message
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyTo,
  isMe,
  myTextColor,
  theirTextColor,
  onPress,
  messages,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Lookup original message from messages list
  const originalMessage = useMemo(() => {
    if (!messages || !replyTo.id) return null;
    return messages.find(m => m.id === replyTo.id || m.messageId === replyTo.id);
  }, [messages, replyTo.id]);

  // Get sender name - prefer original message, fallback to replyTo
  const replySenderName = originalMessage?.senderName || replyTo.senderName || t('messages.replying_to');
  
  // Get reply type - prefer original message type, fallback to replyTo.type
  const replyType = originalMessage?.type || replyTo.type || 'text';
  
  // Get reply text based on type
  let replyText = '';
  
  if (replyType === 'image') {
    replyText = `[${t('chat.image', { defaultValue: 'Hình ảnh' })}]`;
  } else if (replyType === 'video') {
    replyText = `[${t('chat.video', { defaultValue: 'Video' })}]`;
  } else if (replyType === 'file') {
    replyText = `[${t('chat.file', { defaultValue: 'File' })}]`;
  } else if (replyType === 'voice') {
    replyText = `[${t('chat.voice', { defaultValue: 'Tin nhắn thoại' })}]`;
  } else {
    replyText = String(originalMessage?.text || replyTo.text || '').trim() ||
      t('messages.replied_message', { defaultValue: t('chat.reply') });
  }

  const myReplyOverlayBg = 'rgba(255,255,255,0.12)';
  const theirReplyOverlayBg = theme.dark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.05)';
  
  const isMedia = replyType === 'image' || replyType === 'video';
  
  // Get thumbnail URL from original message attachments
  let thumbnailUrl: string | undefined;
  let attachmentUrl: string | undefined;
  
  if (originalMessage?.attachments && originalMessage.attachments.length > 0) {
    const attachment = originalMessage.attachments[0];
    thumbnailUrl = attachment.thumbnailUrl || attachment.thumbnail_url;
    attachmentUrl = attachment.url;
  }
  
  // Fallback to replyTo if no original message found
  const hasThumbnail = thumbnailUrl || attachmentUrl || replyTo.thumbnailUrl || replyTo.attachmentUrl;

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
        <View style={styles.replyBody}>
          {isMedia && hasThumbnail && (
            <Image
              source={{ uri: thumbnailUrl || attachmentUrl || replyTo.thumbnailUrl || replyTo.attachmentUrl }}
              style={styles.replyThumbnail}
              resizeMode="cover"
            />
          )}
          {isMedia && !hasThumbnail && (
            <View style={styles.replyIconContainer}>
              {replyType === 'image' ? (
                <ImageIcon size={20} color={isMe ? myTextColor : theirTextColor} />
              ) : (
                <FileVideo size={20} color={isMe ? myTextColor : theirTextColor} />
              )}
            </View>
          )}
          <Text
            style={[
              styles.replyText,
              { color: isMe ? myTextColor : theirTextColor, opacity: 0.7 },
              isMedia && styles.replyTextWithMedia,
            ]}
            numberOfLines={1}
          >
            {replyText}
          </Text>
        </View>
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
  replyBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  replyThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  replyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyText: { fontSize: 12 },
  replyTextWithMedia: {
    flex: 1,
  },
});

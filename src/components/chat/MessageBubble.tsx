import { USERS_V2 } from '@/src/data/contactsMockData';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { FileText, Play } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export function MessageBubble({
  item,
  onLongPress,
  onImagePress,
  onVideoPress,
}: {
  item: ChatMessage;
  onLongPress?: (item: ChatMessage) => void;
  onImagePress?: (uri: string) => void;
  onVideoPress?: (uri: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const avatar = useMemo(() => {
    if (item.fromMe) return undefined;
    if (item.senderId) {
      const sender = USERS_V2.find((u) => u.id === item.senderId);
      const avatarUrl = sender?.avatar;
      return avatarUrl && avatarUrl.trim() !== '' 
        ? avatarUrl 
        : 'https://i.pravatar.cc/150?u=unknown';
    }
    return 'https://i.pravatar.cc/150?u=unknown';
  }, [item.fromMe, item.senderId]);

  const formatTime = (dateProp: any) => {
    const d = dateProp ? new Date(dateProp) : new Date();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const isImage =
    ((item as any).type === 'image' || (item as any).fileInfo?.mimeType?.startsWith('image/')) ||
    ((item as any).text && typeof (item as any).text === 'string' && (item as any).text.includes('image/')) ||
    ((item as any).content && typeof (item as any).content === 'string' && (item as any).content.includes('image/'));
  const isVideo =
    ((item as any).type === 'video' || (item as any).fileInfo?.mimeType?.startsWith('video/')) ||
    ((item as any).text && typeof (item as any).text === 'string' && (item as any).text.includes('video/')) ||
    ((item as any).content && typeof (item as any).content === 'string' && (item as any).content.includes('video/'));
  const isFile = ((item as any).type === 'file' || ((item as any).fileInfo && !isImage && !isVideo));
  
  // Handle different message content structures
  const messageText = (item as any).text || (item as any).content || '';
  const messageType = (item as any).type || 
    ((item as any).content && typeof (item as any).content === 'string' 
      ? ((item as any).content.includes('image/') ? 'image' : 
          ((item as any).content.includes('video/') ? 'video' : 'text'))
      : 'text');
  const isMe = (item as any).fromMe || ((item as any).sender && (item as any).sender.me === true);
  
  // Get file info from different structures
  const fileInfo = (item as any).fileInfo || ((item as any).attachments && (item as any).attachments.length > 0 ? {
    uri: (item as any).attachments[0]?.url || '',
    name: (item as any).attachments[0]?.name || 'File',
    size: (item as any).attachments[0]?.size || '0 MB',
    mimeType: (item as any).attachments[0]?.mimeType || ''
  } : null);

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.rowRight : styles.rowLeft,
      ]}
    >
      {/* Avatar đối phương */}
      {!isMe && avatar && avatar.trim() !== '' && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}

      <View
        style={[
          styles.bubbleWrapper,
          { 
            alignItems: isMe ? 'flex-end' : 'flex-start',
            justifyContent: isMe ? 'flex-end' : 'flex-start'
          },
        ]}
      >
        <TouchableOpacity
          onLongPress={() => onLongPress?.(item)}
          style={[
            styles.bubble,
            {
              backgroundColor: isMe
                ? theme.colors.primary
                : theme.colors.card,
              borderColor: isMe
                ? theme.colors.primary
                : theme.colors.border,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
            },
            isImage && styles.imageBubble,
            item.replyTo && styles.bubbleWithReply,
            isFile && { minWidth: 220 },
            isVideo && styles.videoBubble,
          ]}
        >
          {/* Reply preview */}
          {item.replyTo && (
            <View
              style={[
                styles.replyWrap,
                {
                  backgroundColor: isMe
                    ? 'rgba(223, 218, 218, 0.15)'
                    : 'rgba(153, 149, 149, 0.08)',
                },
              ]}
            >
              <View
                style={[
                  styles.replyBar,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <View style={styles.replyContent}>
                <Text
                  style={[
                    styles.replyName,
                    { color: isMe ? theme.colors.textMessage : theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.replyTo.senderName}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    { color: isMe ? theme.colors.textMessage : theme.colors.text, opacity: 0.7 },
                  ]}
                  numberOfLines={1}
                >
                  {item.replyTo.text}
                </Text>
              </View>
            </View>
          )}

          {/* Content */}
          {item.isRevoked ? (
            <Text
              style={[
                styles.revoked,
                { color: theme.colors.text, opacity: 0.6 },
              ]}
            >
              {t('messages.revoked')}
            </Text>
          ) : isImage ? (
            <Pressable
              onPress={() =>
                onImagePress?.(item.fileInfo?.uri || '')
              }
            >
              {item.fileInfo?.uri && item.fileInfo.uri.trim() !== '' ? (
                <Image
                  source={{ uri: item.fileInfo.uri }}
                  style={styles.sentImage}
                />
              ) : (
                <View style={[styles.sentImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#999', fontSize: 12 }}>Image not available</Text>
                </View>
              )}
            </Pressable>
          ) : isVideo ? (
            <Pressable
              onPress={() =>
                onVideoPress?.(item.fileInfo?.uri || '')
              }
              style={styles.videoThumb}
            >
              {item.fileInfo?.uri && item.fileInfo.uri.trim() !== '' ? (
                <View
                  style={[
                    styles.videoPlay,
                    {
                      backgroundColor: isMe
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(0,0,0,0.25)',
                    },
                  ]}
                >
                  <Play
                    size={22}
                    color={isMe ? theme.colors.icon : theme.colors.text}
                    fill={isMe ? theme.colors.icon : theme.colors.text}
                  />
                </View>
              ) : (
                <View style={[styles.videoThumb, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#999', fontSize: 12 }}>Video not available</Text>
                </View>
              )}
            </Pressable>
          ) : isFile ? (
            <View style={styles.fileContainer}>
              <View
                style={[
                  styles.fileIconBox,
                  {
                    backgroundColor: isMe
                      ? 'rgba(255,255,255,0.25)'
                      : `${theme.colors.primary}22`,
                  },
                ]}
              >
                <FileText
                  size={22}
                  color={
                    isMe
                      ? theme.colors.icon
                      : theme.colors.primary
                  }
                />
              </View>
              <View style={styles.fileInfo}>
                <Text
                  style={[
                    styles.fileName,
                    {
                      color: isMe
                        ? theme.colors.icon
                        : theme.colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.fileInfo?.name || 'Tài liệu'}
                </Text>
                <Text
                  style={[
                    styles.fileSize,
                    { color: theme.colors.text, opacity: 0.6 },
                  ]}
                >
                  {item.fileInfo?.size || 'N/A'}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: isMe
                    ? theme.colors.textMessage
                    : theme.colors.text,
                },
              ]}
            >
              {messageText}
            </Text>
          )}
        </TouchableOpacity>

        {!item.isRevoked && (
          <Text
            style={[
              styles.timestamp,
              {
                color: theme.colors.text,
                opacity: 0.5,
                alignSelf: isMe ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        )}
      </View>

      {/* Avatar của mình (chỉ render nếu có) */}
      {isMe && avatar && avatar.trim() !== '' && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowLeft: { 
    justifyContent: 'flex-start',
    alignItems: 'flex-start'
  },
  rowRight: { 
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
  },

  bubbleWrapper: {
    maxWidth: '75%',
    flexDirection: 'column',
  },

  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 0.5,
  },

  imageBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  sentImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },

  videoBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  videoThumb: {
    width: 220,
    height: 220,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileSize: { fontSize: 11, marginTop: 2 },

  text: {
    fontSize: 15,
    lineHeight: 20,
  },

  revoked: {
    fontSize: 14,
    fontStyle: 'italic',
  },

  timestamp: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },

  replyWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  replyBar: {
    width: 3,
  },
  replyContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 12,
    marginTop: 1,
  },

  bubbleWithReply: {
    paddingTop: 6,
    minWidth: 220,
  },
});

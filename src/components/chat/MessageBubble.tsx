
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { FileText, Play, Check, CheckCheck, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type MessageBubbleProps = {
  item: ChatMessage;
  onLongPress?: (item: ChatMessage) => void;
  onImagePress?: (uri: string) => void;
  onVideoPress?: (uri: string) => void;
  onReuseRevoked?: (item: ChatMessage) => void;
  onRevokeRestoreExpired?: (messageId: string) => void;
  onPressReply?: (item: ChatMessage) => void;
};

export const MessageBubble = React.memo(
  function MessageBubble({
    item,
    onLongPress,
    onImagePress,
    onVideoPress,
    onReuseRevoked,
    onRevokeRestoreExpired,
    onPressReply,
  }: MessageBubbleProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const avatar = useMemo(() => {
    if (item.fromMe) return undefined;
    if (item.senderId) {
      return `https://i.pravatar.cc/150?u=${encodeURIComponent(item.senderId)}`;
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
  const isMe = (item as any).fromMe || ((item as any).sender && (item as any).sender.me === true);
  const replySenderName = item.replyTo?.senderName || t('messages.replying_to');
  const replyText =
    String(item.replyTo?.text || '').trim() ||
    t('messages.replied_message', { defaultValue: t('chat.reply') });
  const canReuseRevoked =
    Boolean(item.fromMe) &&
    Boolean(item.revokedBackupText && String(item.revokedBackupText).trim().length > 0) &&
    Number(item.revokeRestoreUntil || 0) > Date.now();

  useEffect(() => {
    if (!item.isRevoked) return;
    if (!item.revokedBackupText || !String(item.revokedBackupText).trim()) return;

    const expiresAt = Number(item.revokeRestoreUntil || 0);
    if (!expiresAt) return;

    const remain = expiresAt - Date.now();
    if (remain <= 0) {
      onRevokeRestoreExpired?.(item.id);
      return;
    }

    const timer = setTimeout(() => {
      onRevokeRestoreExpired?.(item.id);
    }, remain);

    return () => clearTimeout(timer);
  }, [item.id, item.isRevoked, item.revokedBackupText, item.revokeRestoreUntil, onRevokeRestoreExpired]);

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
              borderBottomRightRadius: isMe ? 2 : 18,
              borderBottomLeftRadius: isMe ? 18 : 2,
            },
            isImage && styles.imageBubble,
            item.replyTo && styles.bubbleWithReply,
            isFile && { minWidth: 220 },
            isVideo && styles.videoBubble,
          ]}
        >
          {/* Reply preview */}
          {item.replyTo && (
            <Pressable
              onPress={() => onPressReply?.(item)}
              style={({ pressed }) => ([
                styles.replyWrap,
                {
                  backgroundColor: isMe
                    ? 'rgba(223, 218, 218, 0.15)'
                    : 'rgba(153, 149, 149, 0.08)',
                  opacity: pressed ? 0.85 : 1,
                },
              ])}
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
                  {replySenderName}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    { color: isMe ? theme.colors.textMessage : theme.colors.text, opacity: 0.7 },
                  ]}
                  numberOfLines={1}
                >
                  {replyText}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Content */}
          {item.isRevoked ? (
            <View style={styles.revokedRow}>
              {canReuseRevoked && (
                <Pressable
                  onPress={() => onReuseRevoked?.(item)}
                  style={[styles.reuseBtn, { borderColor: theme.colors.border }]}
                >
                  <RotateCcw size={14} color={isMe ? theme.colors.textMessage : theme.colors.text} />
                </Pressable>
              )}
              <Text
                style={[
                  styles.revoked,
                  { color: theme.colors.text, opacity: 0.6 },
                ]}
              >
                {t('messages.revoked')}
              </Text>
            </View>
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

        <View style={[styles.timeRow, { alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
          {!item.isRevoked && (
            <>
              {item.isEdited ? (
                <Text style={[styles.edited, { color: theme.colors.text, opacity: 0.5 }]}>
                  (Đã chỉnh sửa)
                </Text>
              ) : null}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: theme.colors.text,
                    opacity: 0.5,
                  },
                ]}
              >
                {formatTime(item.timestamp)}
              </Text>
            </>
          )}

          {isMe && !item.isRevoked && (
            <View style={styles.receiptIcon}>
              {item.status === 'read' ? (
                <CheckCheck size={14} color={theme.colors.primary} />
              ) : (
                <Check size={14} color={theme.colors.text} opacity={0.5} />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Avatar của mình (chỉ render nếu có) */}
      {isMe && avatar && avatar.trim() !== '' && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}
    </View>
  );
});

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
  revokedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reuseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timestamp: {
    fontSize: 10,
  },
  edited: {
    fontSize: 10,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 4,
    gap: 4,
  },
  receiptIcon: {
    justifyContent: 'center',
    alignItems: 'center',
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

import { useAuth } from '@/src/contexts/AuthContext';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import * as mediaService from '@/src/services/mediaService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { Check, CheckCheck, FileText, Play, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
  onFilePress?: (item: ChatMessage) => void;
  onReuseRevoked?: (item: ChatMessage) => void;
  onRevokeRestoreExpired?: (messageId: string) => void;
  onPressReply?: (item: ChatMessage) => void;
  onReactionPress?: (messageId: string, reactionType: string) => void;
};

export const MessageBubble = React.memo(
  function MessageBubble({
    item,
    onLongPress,
    onImagePress,
    onVideoPress,
    onFilePress,
    onReuseRevoked,
    onRevokeRestoreExpired,
    onPressReply,
    onReactionPress,
  }: MessageBubbleProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  const avatar = useMemo(() => {
    if (item.fromMe) return undefined;
    const avatarUrl = item.senderAvatar || (item as any).sender?.avatarUrl || (item as any).sender?.avatar;
    return avatarUrl;
  }, [item.fromMe, item.senderId, item.senderAvatar]);

  const senderName = useMemo(() => {
    return item.senderName || (item as any).senderName || (item as any).sender?.name || (item as any).sender?.fullName || 'User';
  }, [item.senderName, item]);

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

  useEffect(() => {
    if (!isImage && !isVideo) return;

    const fetchUrl = async () => {
      try {
        const attachment = (item as any).attachment || (item as any).attachments?.[0];
        if (attachment?.key) {
          const url = await mediaService.getAttachmentUrl(
            { key: attachment.key, visibility: attachment.visibility || 'public', url: attachment.url },
            authUser?.id || ''
          );
          setAttachmentUrl(url);

          const tKey = attachment.thumbnailKey || attachment.thumbnail_key;
          if (tKey) {
            const tUrl = await mediaService.getAttachmentUrl(
              { key: tKey, visibility: attachment.visibility || 'public', url: attachment.thumbnailUrl || attachment.thumbnail_url },
              authUser?.id || ''
            );
            console.log('[MessageBubble] Thumbnail URL:', tUrl, 'for key:', tKey);
            setThumbnailUrl(tUrl);
          }
        } else {
          const fallbackUri = (item as any).fileInfo?.uri || '';
          setAttachmentUrl(fallbackUri);
        }
      } catch (error) {
        setAttachmentUrl((item as any).fileInfo?.uri || '');
      }
    };

    fetchUrl();
  }, [item, isImage, isVideo, authUser?.id]);

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
      
      {!isMe && (
        avatar && avatar.trim() !== '' ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <AvatarWithInitials name={senderName} size={36} style={styles.avatar} />
        )
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
              backgroundColor: isMe ? '#0084FF' : '#FFFFFF',
              borderColor: isMe ? '#0084FF' : '#E5E5E5',
              borderTopRightRadius: isMe ? 4 : 16,
              borderTopLeftRadius: isMe ? 16 : 4,
              borderBottomRightRadius: isMe ? 16 : 4,
              borderBottomLeftRadius: isMe ? 4 : 16,
            },
            isImage && styles.imageBubble,
            item.replyTo && styles.bubbleWithReply,
            isFile && { minWidth: 220 },
            isVideo && styles.videoBubble,
          ]}
        >
          
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
                    { color: isMe ? '#FFFFFF' : '#000000' },
                  ]}
                  numberOfLines={1}
                >
                  {replySenderName}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    { color: isMe ? '#FFFFFF' : '#000000', opacity: 0.7 },
                  ]}
                  numberOfLines={1}
                >
                  {replyText}
                </Text>
              </View>
            </Pressable>
          )}

          
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
                onImagePress?.(attachmentUrl || '')
              }
            >
              {attachmentUrl && attachmentUrl.trim() !== '' ? (
                <Image
                  source={{ uri: attachmentUrl }}
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
                onVideoPress?.(attachmentUrl || '')
              }
              style={styles.videoThumb}
            >
              {(thumbnailUrl || attachmentUrl) ? (
                <Image
                  source={{ uri: thumbnailUrl || attachmentUrl }}
                  style={styles.videoThumb}
                />
              ) : (
                <View style={[styles.videoThumb, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#999', fontSize: 12 }}>Video not available</Text>
                </View>
              )}
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
            </Pressable>
          ) : isFile ? (
            <Pressable
              style={styles.fileContainer}
              onPress={() => onFilePress?.(item)}
            >
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
            </Pressable>
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

        <View style={[styles.timeRow, { alignSelf: 'flex-end' }]}>
          {!item.isRevoked && (
            <>
              {item.isEdited ? (
                <Text style={[styles.edited, { color: isMe ? '#FFFFFF' : '#000000', opacity: 0.7 }]}>
                  (Đã chỉnh sửa)
                </Text>
              ) : null}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: isMe ? '#FFFFFF' : '#000000',
                    opacity: 0.7,
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
                <CheckCheck size={14} color="#FFFFFF" />
              ) : (
                <Check size={14} color="#FFFFFF" opacity={0.7} />
              )}
            </View>
          )}
        </View>

        {/* Reactions display - absolute at bottom-right of bubble */}
        {item.reactions && Object.keys(item.reactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(item.reactions).map(([reactionType, userIds]) => {
              const hasMyReaction = userIds.includes(authUser?.id || '');
              const emoji = getReactionEmoji(reactionType);
              return (
                <TouchableOpacity
                  key={reactionType}
                  style={[
                    styles.reactionPill,
                    hasMyReaction && styles.reactionPillActive,
                  ]}
                  onPress={() => hasMyReaction && onReactionPress?.(item.serverMessageId || item.id, reactionType)}
                >
                  <Text style={styles.reactionPillEmoji}>{emoji}</Text>
                  {userIds.length > 1 && (
                    <Text style={styles.reactionPillCount}>{userIds.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      
      {isMe && avatar && avatar.trim() !== '' && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}
    </View>
  );
});

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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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

  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  reactionBadgeActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Modern messenger reaction styles
  reactionsContainer: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    gap: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  reactionPillActive: {
    backgroundColor: '#e5f4ff',
    borderColor: '#3b82f6',
  },
  reactionPillEmoji: {
    fontSize: 14,
  },
  reactionPillCount: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
});

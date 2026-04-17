import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useAuth } from '@/src/contexts/AuthContext';
import * as mediaService from '@/src/services/mediaService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { Check, CheckCheck, FileText, Play, RotateCcw, Share } from 'lucide-react-native';
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
  onImagePress?: (uri: string, urls?: string[], index?: number) => void;
  onVideoPress?: (uri: string) => void;
  onFilePress?: (item: ChatMessage) => void;
  onReuseRevoked?: (item: ChatMessage) => void;
  onRevokeRestoreExpired?: (messageId: string) => void;
  onPressReply?: (item: ChatMessage) => void;
  onReactionPress?: (messageId: string, reactionType: string) => void;
  onForwardPress?: (item: ChatMessage) => void;
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
    onForwardPress,
  }: MessageBubbleProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  const attachments = (item as any).attachments || [];
  const imageAttachments = attachments.filter((a: any) => a.type === 'image' || a.content_type?.startsWith('image/'));
  const hasMultipleImages = imageAttachments.length > 1;
  const previewImages = attachmentUrls.slice(0, 6);

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

    const fetchUrls = async () => {
      try {
        if (hasMultipleImages) {
          // Fetch all image URLs for grouped display
          const urls = await Promise.all(
            imageAttachments.map(async (attachment: any) => {
              if (attachment?.key) {
                return await mediaService.getAttachmentUrl(
                  { key: attachment.key, visibility: attachment.visibility || 'public', url: attachment.url },
                  authUser?.id || ''
                );
              }
              return attachment.url || '';
            })
          );
          setAttachmentUrls(urls);
          setAttachmentUrl(urls[0] || '');
        } else {
          // Single image - use existing logic
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
              setThumbnailUrl(tUrl);
            }
          } else {
            const fallbackUri = (item as any).fileInfo?.uri || '';
            setAttachmentUrl(fallbackUri);
          }
        }
      } catch (error) {
        setAttachmentUrl((item as any).fileInfo?.uri || '');
      }
    };

    fetchUrls();
  }, [item, isImage, isVideo, authUser?.id, hasMultipleImages, imageAttachments]);

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
              backgroundColor: item.forwardedFrom && !isMe ? '#E8F3FF' : (isMe ? '#0084FF' : '#FFFFFF'),
              borderColor: isMe ? '#0084FF' : '#E5E5E5',
              borderTopRightRadius: isMe ? 4 : 16,
              borderTopLeftRadius: isMe ? 16 : 4,
              borderBottomRightRadius: isMe ? 16 : 4,
              borderBottomLeftRadius: isMe ? 4 : 16,
              shadowColor: item.forwardedFrom && !isMe ? '#000' : 'transparent',
              shadowOffset: item.forwardedFrom && !isMe ? { width: 0, height: 1 } : { width: 0, height: 0 },
              shadowOpacity: item.forwardedFrom && !isMe ? 0.1 : 0,
              shadowRadius: item.forwardedFrom && !isMe ? 2 : 0,
              elevation: item.forwardedFrom && !isMe ? 2 : 0,
            },
            isImage && styles.imageBubble,
            item.replyTo && styles.bubbleWithReply,
            item.forwardedFrom && styles.bubbleWithForwarded,
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

          {item.forwardedFrom && (
            <TouchableOpacity
              style={[
                styles.forwardedHeader,
                {
                  backgroundColor: isMe
                    ? 'rgba(223, 218, 218, 0.1)'
                    : 'rgba(107, 114, 128, 0.05)',
                }
              ]}
              onPress={() => {
                // Navigate to original sender profile
                console.log('Navigate to sender profile:', item.forwardedFrom?.source_sender_id);
              }}
            >
              <View
                style={[
                  styles.forwardedAvatarContainer,
                  { backgroundColor: theme.colors.primary + '20' }
                ]}
              >
                <Text style={[styles.forwardedAvatarText, { color: theme.colors.primary }]}>
                  {item.forwardedFrom.source_sender_name_snapshot.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={[
                  styles.forwardedHeaderText,
                  { color: '#6B7280' },
                ]}
              >
                {t('chat.forwarded_from', { defaultValue: 'Từ' })} {item.forwardedFrom.source_sender_name_snapshot} {'>'}
              </Text>
            </TouchableOpacity>
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
                hasMultipleImages ? onImagePress?.(attachmentUrls[0] || '', attachmentUrls, 0) : onImagePress?.(attachmentUrl || '', undefined, 0)
              }
              onLongPress={() => onLongPress?.(item)}
            >
              {hasMultipleImages ? (
                // Grouped images display like Zalo
                <View style={styles.messageWrapper}>
                  {/* Khung chứa lưới ảnh */}
                  <View style={[styles.gridContainer, imageAttachments.length === 1 && styles.gridSingle, imageAttachments.length > 4 && styles.gridExpanded]}>
                    {previewImages.map((url, index) => {
                      const total = imageAttachments.length;
                      let itemStyle = styles.itemSquare; // Mặc định là ô vuông nhỏ

                      // Xử lý layout cho từng trường hợp số lượng ảnh
                      if (total === 1) {
                        itemStyle = styles.itemSingle;
                      } else if (total === 2) {
                        itemStyle = styles.itemSquare;
                      } else if (total === 3 && index === 0) {
                        itemStyle = styles.itemFullWidth; // Ảnh đầu tiên của bộ 3 sẽ nằm ngang hết dòng
                      }

                      // Xử lý khoảng cách (gap) giữa các ảnh
                      if (total >= 5 && index === 0) {
                        itemStyle = styles.itemFullWidth;
                      } else if (total === 5) {
                        itemStyle = styles.itemHalfTall;
                      } else if (total >= 6) {
                        itemStyle = index <= 2 ? styles.itemHalfTall : styles.itemThird;
                      }

                      const isRightEdge = total === 2
                        ? index === 1
                        : total === 3
                          ? index === 2
                          : total === 5
                            ? index === 2 || index === 4
                          : total >= 6
                              ? index === 0 || index === 2 || index === 5
                              : index % 2 !== 0;
                      const marginStyle = isRightEdge ? {} : { marginRight: 2 };
                      const bottomMarginStyle =
                        total === 3
                          ? index === 0 ? { marginBottom: 2 } : {}
                          : total === 4
                            ? index === 0 ? { marginBottom: 2 } : {}
                            : total === 5
                              ? index === 0 || index === 1 || index === 2 ? { marginBottom: 2 } : {}
                              : total >= 6
                                ? index <= 2 ? { marginBottom: 2 } : {}
                                : (total >= 3 && index === 0) || (total >= 4 && index < 2) ? { marginBottom: 2 } : {};

                      return (
                        <Pressable
                          key={index}
                          style={[itemStyle, marginStyle, bottomMarginStyle]}
                          onPress={() => onImagePress?.(url, attachmentUrls, index)}
                        >
                          <Image source={{ uri: url }} style={styles.image} />
                          
                          {/* Overlay hiển thị số ảnh còn lại (+N) */}
                          {index === 5 && total > 6 && (
                            <View style={styles.moreImagesOverlay}>
                              <Text style={styles.moreImagesText}>+{total - 6}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : item.forwardedFrom ? (
                // Link preview card style for forwarded images
                <View
                  style={[
                    styles.linkPreviewCard,
                    {
                      backgroundColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: attachmentUrl || '' }}
                    style={styles.linkPreviewImageLarge}
                  />
                  <View style={styles.linkPreviewContent}>
                    <Text
                      style={[styles.linkPreviewDomain, { color: '#6B7280' }]}
                      numberOfLines={1}
                    >
                      image
                    </Text>
                    <Text
                      style={[
                        styles.linkPreviewFileName,
                        { color: '#000000' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.fileInfo?.name || 'Hình ảnh'}
                    </Text>
                  </View>
                </View>
              ) : (
                // Regular image display with forward button
                <View style={[styles.imageWithForwardContainer, isMe && styles.imageWithForwardContainerReverse]}>
                  {/* Forward Button */}
                  {onForwardPress && (
                    <TouchableOpacity
                      style={[styles.forwardButton, isMe ? styles.forwardButtonMarginRight : styles.forwardButtonMarginLeft]}
                      onPress={() => onForwardPress(item)}
                      activeOpacity={0.7}
                    >
                      <Share size={18} color="#000000" />
                    </TouchableOpacity>
                  )}

                  {/* Image Container */}
                  <View style={styles.imageContainer}>
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

                    {/* Reaction Button (Absolute positioning) */}
                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <View style={[styles.reactionButtonAbsolute, isMe ? styles.reactionButtonRight : styles.reactionButtonLeft]}>
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
                </View>
              )}
              {/* Caption for image */}
              {item.caption && (
                <Text
                  style={[
                    styles.caption,
                    {
                      color: isMe ? theme.colors.textMessage : theme.colors.text,
                    },
                  ]}
                >
                  {item.caption}
                </Text>
              )}
            </Pressable>
          ) : isVideo ? (
            <Pressable
              onPress={() =>
                onVideoPress?.(attachmentUrl || '')
              }
              onLongPress={() => onLongPress?.(item)}
              style={item.forwardedFrom ? undefined : styles.videoThumb}
            >
              {item.forwardedFrom ? (
                // Link preview card style for forwarded videos
                <View
                  style={[
                    styles.linkPreviewCard,
                    {
                      backgroundColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: thumbnailUrl || attachmentUrl || '' }}
                    style={styles.linkPreviewImageLarge}
                  />
                  <View style={styles.linkPreviewContent}>
                    <Text
                      style={[styles.linkPreviewDomain, { color: '#6B7280' }]}
                      numberOfLines={1}
                    >
                      video
                    </Text>
                    <Text
                      style={[
                        styles.linkPreviewFileName,
                        { color: '#000000' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.fileInfo?.name || 'Video'}
                    </Text>
                  </View>
                </View>
              ) : (
                // Regular video display
                <>
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
                </>
              )}

              {/* Caption for video */}
              {item.caption && (
                <Text
                  style={[
                    styles.caption,
                    {
                      color: isMe ? theme.colors.textMessage : theme.colors.text,
                    },
                  ]}
                >
                  {item.caption}
                </Text>
              )}
            </Pressable>
          ) : isFile ? (
            <Pressable
              style={styles.fileContainer}
              onPress={() => onFilePress?.(item)}
            >
              {item.forwardedFrom ? (
                // Link preview card style for forwarded files
                <View
                  style={[
                    styles.linkPreviewCard,
                    {
                      backgroundColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.linkPreviewImage,
                      { backgroundColor: theme.colors.primary + '15' }
                    ]}
                  >
                    <FileText
                      size={32}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.linkPreviewContent}>
                    <Text
                      style={[styles.linkPreviewDomain, { color: '#6B7280' }]}
                      numberOfLines={1}
                    >
                      {item.fileInfo?.uri ? new URL(item.fileInfo.uri).hostname : 'file'}
                    </Text>
                    <Text
                      style={[
                        styles.linkPreviewFileName,
                        { color: '#000000' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.fileInfo?.name || 'Tài liệu'}
                    </Text>
                  </View>
                </View>
              ) : (
                // Regular file display
                <>
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
                </>
              )}

              {/* Caption for file */}
              {item.caption && (
                <Text
                  style={[
                    styles.caption,
                    {
                      color: isMe ? theme.colors.textMessage : theme.colors.text,
                    },
                  ]}
                >
                  {item.caption}
                </Text>
              )}
            </Pressable>
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: item.reactions && Object.keys(item.reactions).length > 0
                    ? (isMe ? '#FFFFFF' : '#000000')
                    : (isMe ? theme.colors.textMessage : theme.colors.text),
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
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

  caption: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },

  imageWithForwardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  imageWithForwardContainerReverse: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },

  forwardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  forwardButtonMarginRight: {
    marginRight: 10,
  },

  forwardButtonMarginLeft: {
    marginLeft: 10,
  },

  imageContainer: {
    position: 'relative',
  },

  reactionButtonAbsolute: {
    position: 'absolute',
    bottom: -10,
  },

  reactionButtonRight: {
    right: -10,
  },

  reactionButtonLeft: {
    left: -10,
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

  bubbleWithForwarded: {
    paddingTop: 4,
    paddingBottom: 8,
  },

  forwardedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  forwardedAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  forwardedAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  forwardedHeaderText: {
    fontSize: 12,
    fontWeight: '400',
  },

  linkPreviewCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    marginBottom: 4,
  },
  linkPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  linkPreviewImageLarge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  linkPreviewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  linkPreviewDomain: {
    fontSize: 11,
    marginBottom: 2,
  },
  linkPreviewFileName: {
    fontSize: 13,
    fontWeight: '600',
  },

  forwardedBanner: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  forwardedText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },

  messageWrapper: {
    marginVertical: 4,
    overflow: 'hidden',
  },

  imageGroupHeader: {
    fontSize: 13,
    marginBottom: 2,
    fontWeight: '500',
    paddingHorizontal: 4,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 242,
    height: 242,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EAEAEA',
  },

  gridSingle: {
    width: 'auto',
    maxWidth: 242,
  },

  gridExpanded: {
    height: 366,
  },

  itemSingle: {
    width: 242,
    height: 242,
  },

  itemSquare: {
    width: 120,
    height: 120,
  },

  itemFullWidth: {
    width: 242,
    height: 120,
  },

  itemHalfTall: {
    width: 120,
    height: 120,
  },

  itemThird: {
    width: 79.33,
    height: 120,
  },

  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '400',
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

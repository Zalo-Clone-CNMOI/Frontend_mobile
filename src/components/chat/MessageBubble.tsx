import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { SystemMessageBanner } from '@/src/components/chat/SystemMessageBanner';
import { useAuth } from '@/src/contexts/AuthContext';
import * as mediaService from '@/src/services/mediaService';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import { Check, CheckCheck, FileArchive, FileAudio, FileText, FileVideo, Forward, Pin, Play, RotateCcw } from 'lucide-react-native';
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
import { useUserProfiles } from '../../hooks/useUserProfiles';

// ─── Helper: HighlightText Component ─────────────────────────────────────────
// Highlights search terms in message text like Zalo

interface HighlightTextProps {
  text: string;
  highlight?: string;
  textColor: string;
  highlightColor: string;
}

function HighlightText({ text, highlight, textColor, highlightColor }: HighlightTextProps) {
  if (!highlight || highlight.trim().length === 0) {
    return (
      <Text style={[styles.text, { color: textColor }]}>
        {text}
      </Text>
    );
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={[styles.text, { color: textColor }]}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === highlight.toLowerCase();
        return (
          <Text
            key={index}
            style={[
              isMatch && {
                backgroundColor: highlightColor,
                borderRadius: 2,
              },
            ]}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

type MessageBubbleProps = {
  item: ChatMessage;
  isGroup?: boolean;
  onLongPress?: (item: ChatMessage) => void;
  onImagePress?: (uri: string, urls?: string[], index?: number) => void;
  onVideoPress?: (uri: string) => void;
  onFilePress?: (item: ChatMessage) => void;
  onReuseRevoked?: (item: ChatMessage) => void;
  onRevokeRestoreExpired?: (messageId: string) => void;
  onPressReply?: (item: ChatMessage) => void;
  onReactionPress?: (messageId: string, reactionType: string) => void;
  onForwardPress?: (item: ChatMessage) => void;
  onNavigateToForwarded?: (forwardedFrom: ChatMessage['forwardedFrom']) => void; // Navigate to original conversation
  highlightText?: string; // For search highlighting
  isPinned?: boolean; // Whether message is pinned
  conversationMembers?: Array<{ userId: string; nickname?: string | null; fullName?: string | null }>; // Conversation members for nickname lookup
};

export const MessageBubble = React.memo(
  function MessageBubble({
    item,
    isGroup = false,
    onLongPress,
    onImagePress,
    onVideoPress,
    onFilePress,
    onReuseRevoked,
    onRevokeRestoreExpired,
    onPressReply,
    onReactionPress,
    onForwardPress,
    onNavigateToForwarded,
    highlightText,
    isPinned = false,
    conversationMembers,
  }: MessageBubbleProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { profiles, fetchUserProfile, getAvatarUrl, loading } = useUserProfiles();
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  const attachments = (item as any).attachments || [];
  const imageAttachments = attachments.filter((a: any) => a.type === 'image' || a.content_type?.startsWith('image/'));
  const hasMultipleImages = imageAttachments.length > 1;
  const previewImages = attachmentUrls.slice(0, 6);

  // ─── Derived theme values ────────────────────────────────────────────────────
  const isDark = theme.dark;
  
  // Bubble background colors – Zalo style
  const myBubbleBg = theme.colors.primary;           // #0068FF (cả light & dark)
  const theirBubbleBg = isDark
    ? theme.colors.card                               // #1C1C1E dark
    : '#F0F1F3';                                      // gần trắng light
  const forwardedTheirBubbleBg = isDark
    ? '#1A2640'
    : '#E8F3FF';

  // Text colors inside bubble
  const myTextColor = theme.colors.textMessage;      // #fff
  const theirTextColor = theme.colors.text;

  // Timestamp / edited text
  const myMetaColor = 'rgba(255,255,255,0.75)';
  const theirMetaColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  // Borders
  const myBubbleBorder = theme.colors.primary;
  const theirBubbleBorder = isDark ? theme.colors.border : '#E0E0E5';
  const imageBorderColor = isDark ? '#2C2C2E' : 'rgba(0,0,0,0.08)';

  // Sender name in group
  const senderNameColor = theme.colors.primary;

  // Reply box
  const myReplyOverlayBg = 'rgba(255,255,255,0.12)';
  const theirReplyOverlayBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  // Forwarded header
  const myForwardedHeaderBg = 'rgba(255,255,255,0.10)';
  const theirForwardedHeaderBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(107,114,128,0.06)';

  // Link preview card (forwarded media/file)
  const linkPreviewCardBg = isDark ? theme.colors.card : '#FFFFFF';
  const linkPreviewDomainColor = isDark ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const linkPreviewFileNameColor = theme.colors.text;

  // File display
  const myFileIconColor = theme.colors.textMessage;
  const theirFileIconColor = theme.colors.primary;
  const myFileSizeColor = 'rgba(255,255,255,0.7)';
  const theirFileSizeColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  // Reaction pills
  const reactionPillBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const reactionPillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const reactionPillActiveBg = isDark ? '#0A2A55' : '#E5F4FF';
  const reactionPillActiveBorder = theme.colors.primary;
  const reactionCountColor = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';

  // Grid image background placeholder
  const gridBg = isDark ? '#2C2C2E' : '#E0E0E5';
  // ──────────────────────────────────────────────────────────────────────────────

  const userProfile = useMemo(() => {
    if (isGroup && !item.fromMe && item.senderId) {
      return profiles[item.senderId];
    }
    return null;
  }, [isGroup, item.fromMe, item.senderId, profiles]);

  const avatar = useMemo(() => {
    if (item.fromMe) return undefined;
    if (isGroup) {
      if (userProfile?.avatarUrl) {
        return getAvatarUrl(item.senderId || '');
      }
      const avatarUrl = item.senderAvatar || (item as any).sender?.avatarUrl || (item as any).sender?.avatar;
      return avatarUrl;
    }
    const avatarUrl = item.senderAvatar || (item as any).sender?.avatarUrl || (item as any).sender?.avatar;
    return avatarUrl;
  }, [item.fromMe, item.senderId, item.senderAvatar, isGroup, userProfile, getAvatarUrl]);

  const senderName = useMemo(() => {
    if (item.fromMe) return 'Bạn';
    if (isGroup && item.senderId) {
      // First, try to get nickname from conversation members (conversation-specific)
      const member = conversationMembers?.find(m => m.userId === item.senderId);
      if (member?.nickname) {
        return member.nickname;
      }
      // Fallback to member.fullName or userProfile.fullName
      if (member?.fullName) {
        return member.fullName;
      }
      if (userProfile?.fullName) {
        return userProfile.fullName;
      }
    }
    if (isGroup && item.senderId && loading[item.senderId]) {
      return 'Đang tải...';
    }
    return item.senderName || (item as any).senderName || (item as any).sender?.name || (item as any).sender?.fullName || 'User';
  }, [item.fromMe, item.senderName, item.senderId, isGroup, userProfile, loading, conversationMembers]);

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
    if (isGroup && !item.fromMe && item.senderId) {
      fetchUserProfile(item.senderId);
    }
  }, [isGroup, item.fromMe, item.senderId, fetchUserProfile]);

  useEffect(() => {
    if (!isImage && !isVideo) return;

    const fetchUrls = async () => {
      try {
        if (hasMultipleImages) {
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

  // ─── Computed bubble background ─────────────────────────────────────────────
  const getBubbleBg = () => {
    if (isImage || isVideo || isFile) return 'transparent';
    if (isMe) return myBubbleBg;
    return theirBubbleBg;
  };

  // Check if this is a system message
  const isSystemMessage = item.messageType === 'system' || item.senderId === 'SYSTEM' || item.type === 'system';

  if (isSystemMessage) {
    return <SystemMessageBanner message={item} />;
  }

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.rowRight : styles.rowLeft,
      ]}
    >
      {/* Left avatar (other user) */}
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
            justifyContent: isMe ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {/* Sender name for group chats */}
        {isGroup && !isMe && (
          <Text style={[styles.senderNameText, { color: senderNameColor }]}>
            {senderName}
          </Text>
        )}

        <TouchableOpacity
          onLongPress={() => onLongPress?.(item)}
          style={[
            styles.bubble,
            {
              backgroundColor: getBubbleBg(),
              borderColor: isMe ? theme.colors.border : theirBubbleBorder,
              borderTopRightRadius: isMe ? 4 : 18,
              borderTopLeftRadius: isMe ? 18 : 4,
              borderBottomRightRadius: 18,
              borderBottomLeftRadius: 18,
            },
            (isImage || isVideo || isFile) && styles.mediaBubble,
            item.replyTo && styles.bubbleWithReply,
            item.forwardedFrom && styles.bubbleWithForwarded,
          ]}
        >
          {/* ── Reply preview ──────────────────────────────────────────────── */}
          {item.replyTo && (
            <Pressable
              onPress={() => onPressReply?.(item)}
              style={({ pressed }) => ([
                styles.replyWrap,
                {
                  backgroundColor: isMe ? myReplyOverlayBg : theirReplyOverlayBg,
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
          )}

          
          
          {/* ── Forwarded header ───────────────────────────────────────────── */}
          {item.forwardedFrom && (                              
            <TouchableOpacity
              style={[
                styles.forwardedHeader,
                {
                  backgroundColor: isMe
                    ? 'rgba(255,255,255,0.15)'  // Subtle white for my messages
                    : theme.colors.primary + '15',  // Subtle primary for their messages
                  borderWidth: 1,
                  borderColor: theme.colors.primary + '40',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 6,
                },
              ]}
              onPress={() => {
                // Navigate to original conversation to view the original message
                onNavigateToForwarded?.(item.forwardedFrom);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.forwardedHeaderContent}>
                <View
                  style={[
                    styles.forwardedAvatarContainer,
                    {
                      backgroundColor: theme.colors.primary + '25',
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      marginRight: 10,
                    },
                  ]}
                >
                  <Text style={[styles.forwardedAvatarText, { 
                    color: theme.colors.primary, 
                    fontSize: 12,
                    fontWeight: '600'
                  }]}>
                    {item.forwardedFrom.source_sender_name_snapshot?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.forwardedContent}>
                  <Text
                    style={[
                      styles.forwardedHeaderText,
                      { 
                        color: theme.colors.text, 
                        fontSize: 13,
                        fontWeight: '500',
                        lineHeight: 16
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t('chat.forwarded_from', { defaultValue: 'Đã chuyển tiếp' })} {item.forwardedFrom.source_sender_name_snapshot || 'Unknown'}
                  </Text>
                  <Text
                    style={[
                      styles.forwardedSubText,
                      { 
                        color: theme.colors.text, 
                        fontSize: 11,
                        opacity: 0.6,
                        marginTop: 1
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Xem tin nhắn gốc
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Content ────────────────────────────────────────────────────── */}
          {item.isRevoked ? (
            <View style={styles.revokedRow}>
              {canReuseRevoked && (
                <Pressable
                  onPress={() => onReuseRevoked?.(item)}
                  style={[styles.reuseBtn, { borderColor: theme.colors.border }]}
                >
                  <RotateCcw size={14} color={isMe ? myTextColor : theme.colors.text} />
                </Pressable>
              )}
              <Text
                style={[
                  styles.revoked,
                  { color: theme.colors.text },
                ]}
              >
                {t('messages.revoked')}
              </Text>
            </View>
          ) : isImage ? (
            <TouchableOpacity
              onPress={() =>
                hasMultipleImages
                  ? onImagePress?.(attachmentUrls[0] || '', attachmentUrls, 0)
                  : onImagePress?.(attachmentUrl || '', undefined, 0)
              }
              onLongPress={() => onLongPress?.(item)}
            >
              {hasMultipleImages ? (
                // ── Multi-image grid ─────────────────────────────────────────
                <View style={[styles.imageWithForwardContainer, !isMe && styles.imageWithForwardContainerReverse]}>
                  {onForwardPress && (
                    <TouchableOpacity
                      style={[
                        styles.forwardButton,
                        { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                        isMe ? styles.forwardButtonMarginLeft : styles.forwardButtonMarginRight,
                      ]}
                      onPress={() => onForwardPress(item)}
                      activeOpacity={0.7}
                    >
                      <Forward size={18} color={theme.colors.icon} />
                    </TouchableOpacity>
                  )}
                  <View style={[
                    styles.gridContainer,
                    { backgroundColor: gridBg },
                    imageAttachments.length === 1 && styles.gridSingle,
                    imageAttachments.length > 4 && styles.gridExpanded,
                  ]}>
                    {previewImages.map((url, index) => {
                      const total = imageAttachments.length;
                      let itemStyle = styles.itemSquare;

                      if (total === 1) {
                        itemStyle = styles.itemSingle;
                      } else if (total === 2) {
                        itemStyle = styles.itemSquare;
                      } else if (total === 3 && index === 0) {
                        itemStyle = styles.itemFullWidth;
                      }

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
              ) : (
                // ── Single image with optional forward button ─────────────────
                <View style={[styles.imageWithForwardContainer, !isMe && styles.imageWithForwardContainerReverse]}>
                  {onForwardPress && (
                    <TouchableOpacity
                      style={[
                        styles.forwardButton,
                        { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                        isMe ? styles.forwardButtonMarginLeft : styles.forwardButtonMarginRight,
                      ]}
                      onPress={() => onForwardPress(item)}
                      activeOpacity={0.7}
                    >
                      <Forward size={18} color={theme.colors.icon} />
                    </TouchableOpacity>
                  )}
                  <View style={styles.imageContainer}>
                    {attachmentUrl && attachmentUrl.trim() !== '' ? (
                      <Image
                        source={{ uri: attachmentUrl }}
                        style={[styles.sentImage, { borderColor: imageBorderColor }]}
                      />
                    ) : (
                      <View style={[styles.sentImage, {
                        backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderColor: imageBorderColor,
                      }]}>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#999', fontSize: 12 }}>
                          Image not available
                        </Text>
                      </View>
                    )}
                    {/* Reactions on image */}
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
                                {
                                  backgroundColor: reactionPillBg,
                                  borderColor: reactionPillBorder,
                                },
                                hasMyReaction && {
                                  backgroundColor: reactionPillActiveBg,
                                  borderColor: reactionPillActiveBorder,
                                },
                              ]}
                              onPress={() => hasMyReaction && onReactionPress?.(item.serverMessageId || item.id, reactionType)}
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
                    )}
                  </View>
                </View>
              )}
              {/* Caption */}
              {item.caption && (
                <Text
                  style={[
                    styles.caption,
                    { color: isMe ? myTextColor : theirTextColor },
                  ]}
                >
                  {item.caption}
                </Text>
              )}
            </TouchableOpacity>
          ) : isVideo ? (
            // ── VIDEO BUBBLE ─────────────────────────────────────────────────
            <TouchableOpacity
              onPress={() => onVideoPress?.(attachmentUrl || '')}
              onLongPress={() => onLongPress?.(item)}
            >
              {/* Forwarded header for video messages */}
              {item.forwardedFrom && (
                <TouchableOpacity
                  style={[
                    styles.forwardedHeader,
                    {
                      backgroundColor: isMe
                        ? 'rgba(255,255,255,0.15)'  // Subtle white for my messages
                        : theme.colors.primary + '15',  // Subtle primary for their messages
                      borderWidth: 1,
                      borderColor: theme.colors.primary + '40',
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      marginBottom: 6,
                    },
                  ]}
                  // onPress={() => {
                  //   // Navigate to original conversation to view the original message
                  //   onNavigateToForwarded?.(item.forwardedFrom);
                  // }}
                  activeOpacity={0.7}
                >
                  <View style={styles.forwardedHeaderContent}>
                    <View
                      style={[
                        styles.forwardedAvatarContainer,
                        {
                          backgroundColor: theme.colors.primary + '25',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          marginRight: 10,
                        },
                      ]}
                    >
                      <Text style={[styles.forwardedAvatarText, { 
                        color: theme.colors.primary, 
                        fontSize: 12,
                        fontWeight: '600'
                      }]}>{item.forwardedFrom.source_sender_name_snapshot?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                    <View style={styles.forwardedContent}>
                      <Text
                        style={[
                          styles.forwardedHeaderText,
                          { 
                            color: theme.colors.text, 
                            fontSize: 13,
                            fontWeight: '500',
                            lineHeight: 16
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {t('chat.forwarded_from', { defaultValue: 'Tin nhắn' })} {item.forwardedFrom.source_sender_name_snapshot || 'Unknown'}
                      </Text>
                      <Text
                        style={[
                          styles.forwardedSubText,
                          { 
                            color: theme.colors.text, 
                            fontSize: 11,
                            opacity: 0.6,
                            marginTop: 1
                          },
                        ]}
                        numberOfLines={1}
                      >
                        Xem tin nhắn gốc
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Regular video card with forward button */}
                <View style={[styles.imageWithForwardContainer, !isMe && styles.imageWithForwardContainerReverse]}>
                  {onForwardPress && (
                    <TouchableOpacity
                      style={[
                        styles.forwardButton,
                        { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                        isMe ? styles.forwardButtonMarginLeft : styles.forwardButtonMarginRight,
                      ]}
                      onPress={() => onForwardPress(item)}
                      activeOpacity={0.7}
                    >
                      <Forward size={18} color={theme.colors.icon} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.videoCard, { borderColor: imageBorderColor }]}>
                    {/* Thumbnail */}
                    {(thumbnailUrl || attachmentUrl) ? (
                      <Image
                        source={{ uri: thumbnailUrl || attachmentUrl }}
                        style={styles.videoCardThumb}
                      />
                    ) : (
                      <View style={[styles.videoCardThumb, { backgroundColor: isDark ? '#2C2C2E' : '#E0E0E5', justifyContent: 'center', alignItems: 'center' }]}>
                        <FileVideo size={40} color={isDark ? 'rgba(255,255,255,0.3)' : '#BBBBBB'} />
                      </View>
                    )}

                    {/* Dark gradient overlay at bottom */}
                    <View style={styles.videoCardOverlay} />

                    {/* Play button centered */}
                    <View style={styles.videoPlayCircle}>
                      <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                    </View>

                    {/* Bottom bar: duration badge only */}
                    <View style={styles.videoCardBottomBar}>
                      <View style={styles.videoDurationBadge}>
                        <Play size={9} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.videoDurationText}>Video</Text>
                      </View>
                    </View>
                  </View>
                </View>
            

              {/* Caption */}
              {item.caption && (
                <Text style={[styles.caption, { color: isMe ? myTextColor : theirTextColor }]}>
                  {item.caption}
                </Text>
              )}
            </TouchableOpacity>
          ) : isFile ? (
            // ── FILE BUBBLE ──────────────────────────────────────────────────
            <TouchableOpacity
              onPress={() => onFilePress?.(item)}
              onLongPress={() => onLongPress?.(item)}
            >
              <View style={[styles.imageWithForwardContainer, !isMe && styles.imageWithForwardContainerReverse]}>
                {onForwardPress && (
                  <TouchableOpacity
                    style={[
                      styles.forwardButton,
                      { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                      isMe ? styles.forwardButtonMarginLeft : styles.forwardButtonMarginRight,
                    ]}
                    onPress={() => onForwardPress(item)}
                    activeOpacity={0.7}
                  >
                    <Forward size={18} color={theme.colors.icon} />
                  </TouchableOpacity>
                )}
                {/* File card matching video card style */}
                <View style={styles.videoCard}>
                  {/* File icon background area (like video thumbnail) */}
                  <View style={[styles.videoCardThumb, { backgroundColor: isDark ? '#2C2C2E' : '#E8E8ED', justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={styles.fileIconLarge}>
                      {getFileIcon(item.fileInfo?.name, isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)')}
                    </View>
                  </View>

                  {/* Dark gradient overlay at bottom */}
                  <View style={styles.videoCardOverlay} />

                  {/* Bottom bar with file type badge */}
                  <View style={styles.videoCardBottomBar}>
                    <View style={styles.videoDurationBadge}>
                      <FileText size={9} color="#FFFFFF" />
                      <Text style={styles.videoDurationText}>{getFileExt(item.fileInfo?.name) || 'FILE'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {item.caption && (
                <Text style={[styles.caption, { color: isMe ? myTextColor : theirTextColor }]}>
                  {item.caption}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            // ── Plain text with optional highlight ────────────────────────────────────
            <HighlightText
              text={messageText}
              highlight={highlightText}
              textColor={isMe ? myTextColor : theirTextColor}
              highlightColor={isMe ? 'rgba(255,255,255,0.4)' : 'rgba(255,193,7,0.8)'}
            />
          )}
        </TouchableOpacity>

        {/* ── Time row ──────────────────────────────────────────────────────── */}
        <View style={[styles.timeRow, { alignSelf: 'flex-end' }]}>
          {!item.isRevoked && (
            <>
              {item.isEdited ? (
                <Text style={[styles.edited, { color: isMe ? myMetaColor : theirMetaColor }]}>
                  (Đã chỉnh sửa)
                </Text>
              ) : null}
              <Text style={[styles.timestamp, { color: isMe ? myMetaColor : theirMetaColor }]}>
                {formatTime(item.timestamp)}
              </Text>
            </>
          )}

          {isPinned && (
            <View style={styles.pinIcon}>
              <Pin size={12} color={isMe ? myMetaColor : theirMetaColor} fill={isMe ? myMetaColor : theirMetaColor} />
            </View>
          )}

          {isMe && !item.isRevoked && (
            <View style={styles.receiptIcon}>
              {item.status === 'read' ? (
                <CheckCheck size={14} color={myTextColor} />
              ) : (
                <Check size={14} color={myMetaColor} />
              )}
            </View>
          )}
        </View>

        {/* ── Reactions row ─────────────────────────────────────────────────── */}
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
                    {
                      backgroundColor: reactionPillBg,
                      borderColor: reactionPillBorder,
                    },
                    hasMyReaction && {
                      backgroundColor: reactionPillActiveBg,
                      borderColor: reactionPillActiveBorder,
                    },
                  ]}
                  onPress={() => hasMyReaction && onReactionPress?.(item.serverMessageId || item.id, reactionType)}
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
        )}
      </View>

      {/* Right avatar (shown for sent messages – optional) */}
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

// ── File helper functions ──────────────────────────────────────────────────────
const getFileExt = (name?: string): string => {
  if (!name) return 'FILE';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
};

const getFileIcon = (name: string | undefined, color: string) => {
  const ext = getFileExt(name).toLowerCase();
  if (['mp3', 'aac', 'wav', 'ogg', 'm4a', 'flac'].includes(ext))
    return <FileAudio size={26} color={color} />;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext))
    return <FileVideo size={26} color={color} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return <FileArchive size={26} color={color} />;
  return <FileText size={26} color={color} />;
};

const getFileIconBg = (
  name: string | undefined,
  isMe: boolean,
  primary: string,
  isDark: boolean,
): string => {
  if (isMe) return 'rgba(255,255,255,0.18)';
  const ext = getFileExt(name).toLowerCase();
  if (['mp3', 'aac', 'wav', 'ogg', 'm4a', 'flac'].includes(ext))
    return isDark ? '#1A2A3A' : '#E8F4FF';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext))
    return isDark ? '#1A2A1A' : '#EAF7EA';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return isDark ? '#2A2010' : '#FFF5E0';
  return isDark ? '#1A1A2E' : primary + '15';
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',           // avatars align to top of bubble
  },
  rowLeft: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginHorizontal: 6,
  },

  bubbleWrapper: {
    maxWidth: '75%',
    flexDirection: 'column',
  },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 0.5,
  },

  mediaBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  sentImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    borderWidth: 0.5,
  },

  // ── Video card styles ───────────────────────────────────────────────────────
  videoCard: {
    width: 240,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  videoCardThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    bottom: 0,
    height: undefined,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoPlayCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    top: '50%',
    marginTop: -26,
  },
  videoCardBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  videoDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // File card (reuses video card structure)
  fileIconLarge: {
    transform: [{ scale: 1.8 }],
  },
  videoForwardBtnInCard: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Forwarded video card
  videoForwardedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    padding: 8,
    alignItems: 'center',
    minWidth: 220,
  },
  videoForwardedThumbBox: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
  },
  videoForwardedThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoForwardedPlayIcon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoForwardedInfo: { flex: 1 },
  videoForwardedLabel: { fontSize: 11, marginBottom: 2 },
  videoForwardedName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  text: {
    fontSize: 15,
    lineHeight: 20,
  },

  caption: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  senderNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
    marginLeft: 2,
  },

  // Image + forward layout
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
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    zIndex: 10,
  },
  forwardButtonMarginRight: { marginRight: 12 },
  forwardButtonMarginLeft: { marginLeft: 12 },
  forwardButtonMulti: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    zIndex: 10,
    position: 'absolute',
    top: 4,
  },
  forwardButtonMultiRight: { right: 4 },
  forwardButtonMultiLeft: { left: 4 },

  imageContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  reactionButtonAbsolute: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    gap: 4,
  },
  reactionButtonRight: { right: -10 },
  reactionButtonLeft: { left: -10 },

  // Revoked
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

  // Timestamps
  timestamp: { fontSize: 10 },
  edited: { fontSize: 10 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginHorizontal: 2,
    gap: 3,
  },
  receiptIcon: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinIcon: {
    marginLeft: 4,
  },

  // Reply preview
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

  bubbleWithReply: {
    paddingTop: 8,
    minWidth: 220,
  },
  bubbleWithForwarded: {
    paddingTop: 4,
    paddingBottom: 8,
  },

  // Forwarded header - Made more prominent
  forwardedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'stretch', // Take full width of bubble
    marginHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  forwardedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forwardedAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  forwardedAvatarText: { fontSize: 12, fontWeight: '600' },
  forwardedHeaderText: { fontSize: 13, fontWeight: '500' },
  forwardedContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 4,
  },
  forwardedSubText: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  forwardedArrow: {
    fontSize: 20,
    fontWeight: '400',
    marginLeft: 4,
  },

  // Link preview card
  linkPreviewCard: {
    flexDirection: 'row',
    borderRadius: 10,
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
    width: 58,
    height: 58,
    borderRadius: 8,
    marginRight: 8,
  },
  linkPreviewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  linkPreviewDomain: { fontSize: 11, marginBottom: 2 },
  linkPreviewFileName: { fontSize: 13, fontWeight: '600' },

  // Multi-image grid
  messageWrapper: {
    overflow: 'hidden',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 242,
    height: 242,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gridSingle: { width: 'auto', maxWidth: 242 },
  gridExpanded: { height: 366 },

  itemSingle: { width: 242, height: 242 },
  itemSquare: { width: 120, height: 120 },
  itemFullWidth: { width: 242, height: 120 },
  itemHalfTall: { width: 120, height: 120 },
  itemThird: { width: 79.33, height: 120 },

  image: { width: '100%', height: '100%', resizeMode: 'cover' },

  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '400',
  },

  // Reactions
  reactionsContainer: {
    position: 'absolute',
    bottom: -12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0.5,
  },
  reactionPillEmoji: { fontSize: 13 },
  reactionPillCount: { fontSize: 11, fontWeight: '600' },

  // ── File card styles ────────────────────────────────────────────────────────
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
    minWidth: 240,
    maxWidth: 280,
    overflow: 'hidden',
  },
  fileCardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fileCardBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  fileCardName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  fileCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  fileCardSize: { fontSize: 11 },
  fileCardDot: { fontSize: 11 },
  fileCardExt: { fontSize: 11, textTransform: 'uppercase' },
  fileCardAction: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0.5,
  },
  fileForwardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  fileForwardLabel: {
    fontSize: 12,
  },
});

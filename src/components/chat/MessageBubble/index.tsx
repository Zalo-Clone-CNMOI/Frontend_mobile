import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { SystemMessageBanner } from '@/src/components/chat/SystemMessageBanner';
import { PollCard } from '@/src/components/chat/PollCard';
import { InviteMessageBubble } from '@/src/components/chat/InviteMessageBubble';
import { ForwardedHeader } from './components/ForwardedHeader';
import { ReplyPreview } from './components/ReplyPreview';
import { MessageReactions } from './components/MessageReactions';
import { useAuth } from '@/src/contexts/AuthContext';
import * as mediaService from '@/src/services/mediaService';
import { useTheme } from '@/src/theme/themeContext';
import { NETWORK_CONFIG } from '@/src/config/network';
import type { ChatMessage, Attachment } from '@/src/types/chat';
import type { PollMessageMetadata } from '@/src/types/dto/PollDTO';
import type { FileVisibility } from '@/src/types/media';
import type { ConversationMember } from '@/src/types/interface/chat-interface';
import { Check, CheckCheck, FileArchive, FileAudio, FileText, FileVideo, Forward, Pause, Pin, Play, RotateCcw } from 'lucide-react-native';
import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUserProfiles } from '@/src/hooks/useUserProfiles';
import type { DetectedEntity } from '@/src/store/useEntityDetectionStore';
import { MentionHighlight } from '@/src/components/chat/MentionHighlight';
import { EntityInfoModal } from '../EntityInfoModal';
import { ENTITY_COLORS } from '@/src/constants/entityColors';
import Markdown from 'react-native-markdown-display';

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
  conversationId?: string;
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
  conversationMembers?: ConversationMember[]; // Conversation members for nickname lookup
  currentUserRole?: 'owner' | 'admin' | 'member';
  // Whether this message is in the 1-on-1 Zai AI conversation
  isZaiConversation?: boolean;
  // Zai bot's avatar URL, computed reactively in the parent from the conversation detail store
  zaiAvatarUrl?: string;
  // Multi-select props
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (messageId: string) => void;
  // Messages list for reply lookup
  messages?: ChatMessage[];
  // Entity detection
  entities?: DetectedEntity[];
  onEntityPress?: (entity: DetectedEntity) => void;
  /** Entity detection is still in-flight for this message (shows an "analyzing…" hint). */
  isEntityPending?: boolean;
};

export const MessageBubble = React.memo(
  function MessageBubble({
    item,
    conversationId,
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
    currentUserRole,
    isZaiConversation = false,
    zaiAvatarUrl,
isMultiSelectMode = false,
    isSelected = false,
    onToggleSelection,
    messages,
    entities,
    onEntityPress,
    isEntityPending = false,
  }: MessageBubbleProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const { user: authUser } = useAuth();
    const { profiles, fetchUserProfile, getAvatarUrl, loading } = useUserProfiles();
    const [attachmentUrl, setAttachmentUrl] = useState<string>('');
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    const fetchedUrlsRef = useRef(false);
    const [showEntityModal, setShowEntityModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
    const displayEntities = entities && entities.length > 0 ? entities : undefined;

    // Audio playback state for voice messages
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackDuration, setPlaybackDuration] = useState<number>(0);
    const [playbackPosition, setPlaybackPosition] = useState<number>(0);
    const [voiceUrl, setVoiceUrl] = useState<string>('');

    const handleEntityPress = (entity: DetectedEntity) => {
      if (onEntityPress) {
        onEntityPress(entity);
      } else {
        setSelectedEntity(entity);
        setShowEntityModal(true);
      }
    };

    const attachments: Attachment[] = item.attachments || [];
  const imageAttachments = attachments.filter((a: Attachment) => a.type === 'image' || a.content_type?.startsWith('image/'));
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

  const conversationMember = useMemo(() => {
    if (item.senderId && conversationMembers) {
      return conversationMembers.find(m => m.userId === item.senderId);
    }
    return null;
  }, [item.senderId, conversationMembers]);

  const normalizeAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
    if (!avatarUrl) return undefined;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      const regex = /https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/;
      return avatarUrl.replace(regex, NETWORK_CONFIG.S3_BASE_URL);
    }
    return `${NETWORK_CONFIG.S3_BASE_URL}/${avatarUrl.replace(/^\//, '')}`;
  };

  // True for any message that is from the Zai bot — detected via conversation type (most
  // reliable) or senderId (for group chats where @Zai was mentioned).
  const isZaiMessage = !item.fromMe && item.type !== 'system' && (
    isZaiConversation ||
    item.senderId === NETWORK_CONFIG.ZAI_BOT_ID
  );

  const avatar = useMemo(() => {
    if (item.fromMe) return undefined;

    if (isZaiMessage) {
      // Prefer the pre-computed zaiAvatarUrl from the parent (reactive Zustand selector).
      // Fall back to searching conversationMembers by the known bot ID.
      // Never use conversationMember (keyed by item.senderId — may be wrong) or
      // item.senderAvatar (backend may send another user's URL).
      const url = zaiAvatarUrl
        || conversationMembers?.find(m => m.userId === NETWORK_CONFIG.ZAI_BOT_ID)?.avatarUrl;
      return url ? normalizeAvatarUrl(url) : undefined;
    }

    // Try conversation member avatar first
    if (conversationMember?.avatarUrl) {
      return normalizeAvatarUrl(conversationMember.avatarUrl);
    }

    // Try userProfile avatar (group chats only)
    if (userProfile?.avatarUrl) {
      return getAvatarUrl(item.senderId || '');
    }

    // Fallback to item fields
    const avatarUrl = item.senderAvatar || item.sender?.avatarUrl || item.sender?.avatar;
    return avatarUrl ? normalizeAvatarUrl(avatarUrl) : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.fromMe, item.senderId, item.senderAvatar, item.sender?.avatarUrl, item.sender?.avatar, isGroup, userProfile, conversationMember, conversationMembers, getAvatarUrl, isZaiMessage, zaiAvatarUrl]);

  const senderName = useMemo(() => {
    if (item.fromMe) return t('chat.you');
    if (isZaiMessage) return 'Zai';

    if (item.senderId) {
      // First, try to get nickname from conversation members (conversation-specific)
      if (conversationMember?.nickname) {
        return conversationMember.nickname;
      }
      // Fallback to member.fullName
      if (conversationMember?.fullName) {
        return conversationMember.fullName;
      }
      // Try userProfile.fullName
      if (userProfile?.fullName) {
        return userProfile.fullName;
      }
      // Fallback to item fields
      if (item.senderName) {
        return item.senderName;
      }
      if (item.sender?.name) {
        return item.sender.name;
      }
      if (item.sender?.fullName) {
        return item.sender.fullName;
      }
    }
    
    if (isGroup && item.senderId && loading[item.senderId]) {
      return t('common.loading');
    }
    return 'User';
  }, [item.fromMe, item.senderName, item.senderId, item.sender?.name, item.sender?.fullName, isGroup, userProfile, loading, conversationMember, isZaiMessage, t]);

  // Memoized so the Markdown `style` prop keeps a stable reference across renders
  // (react-native-markdown-display re-parses styles on a new object). Inputs only
  // change on theme toggle, so this holds stable during scrolls (review W2).
  const markdownStylesLeft = useMemo(
    () => makeMarkdownStylesLeft(theirTextColor, isDark),
    [theirTextColor, isDark],
  );

  const formatTime = (dateProp: any) => {
    const d = dateProp ? new Date(dateProp) : new Date();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const isImage =
    (item.type === 'image' || item.fileInfo?.mimeType?.startsWith('image/')) ||
    (item.text && typeof item.text === 'string' && item.text.includes('image/')) ||
    (item.content && typeof item.content === 'string' && item.content.includes('image/'));
  const isVideo =
    (item.type === 'video' || item.fileInfo?.mimeType?.startsWith('video/')) ||
    (item.text && typeof item.text === 'string' && item.text.includes('video/')) ||
    (item.content && typeof item.content === 'string' && item.content.includes('video/'));
  const isVoice = item.type === 'voice' || (item.fileInfo?.mimeType?.startsWith('audio/')) || false;
  const isFile = (item.type === 'file' || (item.fileInfo && !isImage && !isVideo && !isVoice));

  useEffect(() => {
    if (isGroup && !item.fromMe && item.senderId && item.senderId !== 'SYSTEM' && item.senderId !== NETWORK_CONFIG.ZAI_BOT_ID) {
      fetchUserProfile(item.senderId);
    }
  }, [isGroup, item.fromMe, item.senderId, fetchUserProfile]);

  useEffect(() => {
    if (!isImage && !isVideo) return;

    // Reset fetch flag when message changes
    const messageId = item.messageId || item.id;
    if (fetchedUrlsRef.current) {
      fetchedUrlsRef.current = false;
    }

    const fetchUrls = async () => {
      if (fetchedUrlsRef.current) return;
      fetchedUrlsRef.current = true;

      try {
        if (hasMultipleImages) {
          const urls = await Promise.all(
            imageAttachments.map(async (attachment: Attachment) => {
              if (attachment?.key) {
                return await mediaService.getAttachmentUrl(
                  { key: attachment.key, visibility: (attachment.visibility || 'public') as FileVisibility, url: attachment.url },
                  authUser?.id || ''
                );
              }
              return attachment.url || '';
            })
          );
          setAttachmentUrls(urls);
          setAttachmentUrl(urls[0] || '');
        } else {
          const attachment = item.attachment || item.attachments?.[0];
          if (attachment?.key) {
            const url = await mediaService.getAttachmentUrl(
              { key: attachment.key, visibility: (attachment.visibility || 'public') as FileVisibility, url: attachment.url },
              authUser?.id || ''
            );
            setAttachmentUrl(url);

            const tKey = attachment.thumbnailKey || attachment.thumbnail_key;
            if (tKey) {
              const tUrl = await mediaService.getAttachmentUrl(
                { key: tKey, visibility: (attachment.visibility || 'public') as FileVisibility, url: attachment.thumbnailUrl || attachment.thumbnail_url },
                authUser?.id || ''
              );
              setThumbnailUrl(tUrl);
            }
          } else {
            const fallbackUri = item.fileInfo?.uri || '';
            setAttachmentUrl(fallbackUri);
          }
        }
      } catch (error) {
        setAttachmentUrl(item.fileInfo?.uri || '');
      }
    };

    fetchUrls();
  }, [item.messageId || item.id, isImage, isVideo]);

  const messageText = item.text || item.content || '';
  const isMe = Boolean(item.fromMe) || Boolean(item.sender?.me);

  
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

  // ─── Voice message audio loading ────────────────────────────────────────────
  useEffect(() => {
    if (!isVoice) return;

    const resolveAndLoadAudio = async () => {
      try {
        const attachment = item.attachment || item.attachments?.[0];
        let resolvedUrl = '';

        if (attachment?.key) {
          resolvedUrl = await mediaService.getAttachmentUrl(
            { key: attachment.key, visibility: (attachment.visibility || 'private') as FileVisibility, url: undefined },
            authUser?.id || ''
          );
        } else if (item.fileInfo?.uri) {
          resolvedUrl = item.fileInfo.uri;
        } else if (attachment?.url) {
          resolvedUrl = attachment.url;
        }

        if (!resolvedUrl) return;
        setVoiceUrl(resolvedUrl);

        // Clean up existing sound
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        // Create and load new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: resolvedUrl },
          { shouldPlay: false },
          (status) => {
            if (status.isLoaded) {
              setPlaybackDuration(status.durationMillis || 0);
              setPlaybackPosition(status.positionMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                newSound?.setPositionAsync(0);
              }
            }
          }
        );
        setSound(newSound);
      } catch (error) {
        // Silent fail - voice message will show without playback
      }
    };

    resolveAndLoadAudio();

    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [item.messageId || item.id, isVoice]);

  const handlePlayPause = async () => {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // ─── Computed bubble background ─────────────────────────────────────────────
  const getBubbleBg = () => {
    if (isImage || isVideo || isFile || isVoice) return 'transparent';
    if (isMe) return myBubbleBg;
    return theirBubbleBg;
  };

  // Check if this is an invite message
  const isInviteMessage = item.messageType === 'invite' || item.type === 'invite';

  if (isInviteMessage) {
    return (
      <View style={styles.systemMessageContainer}>
        <InviteMessageBubble item={item} isMe={isMe ?? false} />
      </View>
    );
  }

  // Check if this is a system message
  const isSystemMessage = item.messageType === 'system' || item.senderId === 'SYSTEM' || item.type === 'system';

  if (isSystemMessage) {
    return <SystemMessageBanner message={item} />;
  }

  // Check if this is a poll message
  const isPollMessage = item.messageType === 'poll' || item.type === 'poll';
  const pollMetadata = item.metadata as PollMessageMetadata | undefined;

  if (isPollMessage && pollMetadata?.poll_id && conversationId) {
    return (
      <View style={styles.pollContainer}>
        <PollCard
          message={item}
          metadata={pollMetadata}
          conversationId={conversationId}
          currentUserId={authUser?.id || ''}
        />
      </View>
);
}

interface EntityHighlightTextProps {
  text: string;
  entities: DetectedEntity[];
  textColor: string;
  entityColors?: Record<string, string>;
  onEntityPress?: (entity: DetectedEntity) => void;
  isMe?: boolean;
}

function EntityHighlightText({
  text,
  entities,
  textColor,
  entityColors = {},
  onEntityPress,
  isMe = false,
}: EntityHighlightTextProps) {
  const highConfidenceEntities = entities.filter(
    (e) =>
      e.confidence > 0.75 &&
      typeof e.start_index === 'number' &&
      typeof e.end_index === 'number' &&
      e.start_index >= 0 &&
      e.end_index >= e.start_index &&
      e.start_index < text.length
  );

  if (!highConfidenceEntities || highConfidenceEntities.length === 0) {
    return (
      <Text style={[styles.text, { color: textColor }]}>
        {text}
      </Text>
    );
  }

  const sortedEntities = [...highConfidenceEntities].sort(
    (a, b) => (a.start_index ?? 0) - (b.start_index ?? 0)
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedEntities.forEach((entity, idx) => {
    const startIdx = entity.start_index ?? lastIndex;
    const endIdx = entity.end_index ?? startIdx;

    if (startIdx > lastIndex && startIdx < text.length) {
      parts.push(
        <Text key={`text-${lastIndex}`} style={[styles.text, { color: textColor }]}>
          {text.slice(lastIndex, startIdx)}
        </Text>
      );
    }

    const color = entityColors[entity.type] || '#6366f1';
    // On a "me" bubble (solid blue) the entity's type colour can blend into the
    // background — a blue `person` chip on the blue bubble was nearly invisible.
    // There, use a high-contrast translucent-white treatment (matching the
    // mention/search highlight convention). On "them" bubbles keep the type
    // colour but at a stronger opacity than before (~25% vs the old ~19%), plus
    // a bold slice and underline so the tappable entity actually stands out.
    const highlightBg = isMe ? 'rgba(255,255,255,0.28)' : color + '40';
    const underlineColor = isMe ? 'rgba(255,255,255,0.95)' : color;
    parts.push(
      <Text
        key={`entity-${idx}-${entity.text}`}
        style={[
          styles.text,
          {
            color: textColor,
            fontWeight: '600',
            backgroundColor: highlightBg,
            borderRadius: 3,
            borderBottomWidth: 2,
            borderBottomColor: underlineColor,
          },
        ]}
        onPress={() => onEntityPress?.(entity)}
      >
        {text.slice(startIdx, Math.min(endIdx, text.length))}
      </Text>
    );

    lastIndex = Math.min(endIdx, text.length);
  });

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`text-${lastIndex}`} style={[styles.text, { color: textColor }]}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return <Text>{parts}</Text>;
}

// ─── Helper: HighlightText Component ─────────────────────────────────────────
// Highlights search terms in message text like Zalo

interface HighlightTextProps {
  text: string;
  highlight?: string;
  textColor: string;
  highlightColor: string;
}

  // Handle press - toggle selection in multi-select mode
  const handlePress = () => {
    if (isMultiSelectMode) {
      onToggleSelection?.(item.id);
    }
  };

  // Handle long press - enter multi-select mode and select current
  const handleLongPress = () => {
    if (!isMultiSelectMode) {
      onLongPress?.(item);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.rowRight : styles.rowLeft,
        isMultiSelectMode && styles.containerMultiSelect,
      ]}
    >
      {/* Checkbox for multi-select mode */}
      {isMultiSelectMode && (
        <TouchableOpacity
          onPress={() => onToggleSelection?.(item.id)}
          style={[
            styles.checkbox,
            isSelected ? styles.checkboxSelected : styles.checkboxUnselected,
            { borderColor: theme.colors.primary },
          ]}
        >
          {isSelected && (
            <View style={[styles.checkboxInner, { backgroundColor: theme.colors.primary }]}>
              <Check size={14} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Left avatar (other user) - hidden in multi-select mode */}
      {!isMultiSelectMode && !isMe && (
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
          isMultiSelectMode && styles.bubbleWrapperMultiSelect,
        ]}
      >
        {/* Sender name for group chats */}
        {isGroup && !isMe && !isMultiSelectMode && (
          <Text style={[styles.senderNameText, { color: senderNameColor }]}>
            {senderName}
          </Text>
        )}

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          disabled={isMultiSelectMode && false} // Enable press in multi-select mode
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
            (isImage || isVideo || isFile || isVoice) && styles.mediaBubble,
            item.replyTo && styles.bubbleWithReply,
            item.forwardedFrom && styles.bubbleWithForwarded,
          ]}
        >
          {/* ── Reply preview ──────────────────────────────────────────────── */}
          {item.replyTo && (() => {
            // Check if original message exists and is not deleted
            const originalMessage = messages?.find(m => m.id === item.replyTo?.id || m.messageId === item.replyTo?.id);
            const isOriginalDeleted = originalMessage?.isRevoked;
            return !isOriginalDeleted;
          })() && (
            <ReplyPreview
              replyTo={item.replyTo}
              isMe={isMe ?? false}
              myTextColor={myTextColor}
              theirTextColor={theirTextColor}
              onPress={() => onPressReply?.(item)}
              messages={messages}
            />
          )}

          
          
          {/* ── Forwarded header ───────────────────────────────────────────── */}
          {item.forwardedFrom && (isImage || isVideo || isFile || isVoice) && (
            <ForwardedHeader
              forwardedFrom={item.forwardedFrom}
              isMe={isMe ?? false}
              onPress={() => onNavigateToForwarded?.(item.forwardedFrom)}
            />
          )}

          {/* ── Content ────────────────────────────────────────────────────── */}
          {item.isRevoked || item.removed ? (
            <View style={styles.revokedRow}>
              <Text
                style={[
                  styles.revoked,
                  { color: theme.colors.text },
                ]}
              >
                {item.removed ? (
                item.removalReason === 'ai_moderation' ? (
                  <Text style={[styles.revoked, { color: theme.colors.text }]}>
                    {t('messages.removed_by_moderation', { defaultValue: 'Message removed by AI moderation' })}
                  </Text>
                ) : (
                  <Text style={[styles.revoked, { color: theme.colors.text }]}>
                    {item.removalReason || t('messages.removed')}
                  </Text>
                )
              ) : (
                <Text style={[styles.revoked, { color: theme.colors.text }]}>
                  {t('messages.revoked')}
                </Text>
              )}
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
                          {t('messages.image_not_available', { defaultValue: 'Image not available' })}
                        </Text>
                      </View>
                    )}
                    {/* Reactions on image */}
                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <MessageReactions
                        reactions={item.reactions}
                        currentUserId={authUser?.id || ''}
                        onReactionPress={(reactionType) => onReactionPress?.(item.serverMessageId || item.id, reactionType)}
                        isAbsolute={true}
                        isMe={isMe ?? false}
                      />
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
                <ForwardedHeader
                  forwardedFrom={item.forwardedFrom}
                  isMe={isMe ?? false}
                  onPress={() => onNavigateToForwarded?.(item.forwardedFrom)}
                />
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
          ) : isVoice ? (
            <TouchableOpacity
              onPress={handlePlayPause}
              onLongPress={() => onLongPress?.(item)}
              activeOpacity={0.7}
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
                <View style={[styles.voiceContainer, { backgroundColor: isMe ? myBubbleBg : theirBubbleBg, borderColor: isMe ? theme.colors.border : theirBubbleBorder }]}>
                  <View style={styles.voiceRow}>
                    <View style={[styles.voicePlayBtn, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : theme.colors.primary }]}>
                      {isPlaying ? (
                        <Pause size={18} color="#FFF" fill="#FFF" />
                      ) : (
                        <Play size={18} color="#FFF" fill="#FFF" style={{ marginLeft: 2 }} />
                      )}
                    </View>
                    <View style={styles.voiceWaveform}>
                      <View style={[styles.voiceProgressTrack, { backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]}>
                        <View style={[styles.voiceProgressFill, {
                          width: playbackDuration > 0 ? `${(playbackPosition / playbackDuration) * 100}%` : '0%',
                          backgroundColor: isMe ? '#FFF' : theme.colors.primary
                        }]} />
                      </View>
                      <View style={styles.voiceBars}>
                        {[3, 5, 4, 7, 5, 8, 6, 9, 5, 7, 4, 6].map((h, i) => (
                          <View
                            key={i}
                            style={[styles.voiceBar, {
                              height: h,
                              backgroundColor: isMe ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
                            }]}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.voiceTime, { color: isMe ? myMetaColor : theirMetaColor }]}>
                    {playbackDuration > 0
                      ? `${Math.floor(playbackPosition / 60000)}:${String(Math.floor((playbackPosition % 60000) / 1000)).padStart(2, '0')} / ${Math.floor(playbackDuration / 60000)}:${String(Math.floor((playbackDuration % 60000) / 1000)).padStart(2, '0')}`
                      : 'Voice message'}
                  </Text>
                </View>
              </View>
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
            // ── Plain text with optional mention/entity/search/markdown highlight ──
            <View>
              {(item.bodyFormat === 'markdown' || isZaiMessage) ? (
                // Render Markdown for any Zai reply — not only when the `bodyFormat`
                // flag is present. The backend emits body_format on the live socket
                // fanout but does NOT persist it to ScyllaDB / return it from the
                // history read, so after exit+re-enter the flag is gone and the
                // reply would otherwise show raw '**'. Gating on isZaiMessage makes
                // markdown rendering reload-proof. markdownStylesLeft is theme-aware
                // so text stays visible in dark mode (was hardcoded #1a1a1a).
                // NOTE: Markdown intentionally takes priority over the mention /
                // entity / search branches below for Zai messages. If Zai replies
                // ever start carrying mentions or entity offsets, this branch must
                // be split so those highlights aren't dropped (review W1).
                <Markdown style={isMe ? markdownStylesRight : markdownStylesLeft}>
                  {messageText}
                </Markdown>
              ) : item.mentions && item.mentions.length > 0 ? (
                <MentionHighlight
                  text={messageText}
                  mentions={item.mentions}
                  textColor={isMe ? myTextColor : theirTextColor}
                  highlightColor={isMe ? 'rgba(255,255,255,0.2)' : theme.colors.primary + '20'}
                />
              ) : displayEntities && displayEntities.length > 0 ? (
                <EntityHighlightText
                  text={messageText}
                  entities={displayEntities}
                  textColor={isMe ? myTextColor : theirTextColor}
                  entityColors={ENTITY_COLORS}
                  onEntityPress={handleEntityPress}
                  isMe={isMe}
                />
              ) : (
                <HighlightText
                  text={messageText}
                  highlight={highlightText}
                  textColor={isMe ? myTextColor : theirTextColor}
                  highlightColor={isMe ? 'rgba(255,255,255,0.4)' : 'rgba(255,193,7,0.8)'}
                />
              )}

              {/* Entity detection in-flight: subtle hint so the user knows the
                  bubble is being analyzed (results highlight in-place when they
                  arrive). Hidden once entities exist or the pending state clears. */}
              {isEntityPending && !(displayEntities && displayEntities.length > 0) && (
                <Text
                  style={[
                    styles.entityAnalyzing,
                    { color: isMe ? myMetaColor : theirMetaColor },
                  ]}
                >
                  {t('ai.entity.analyzing', { defaultValue: '✨ Đang phân tích…' })}
                </Text>
              )}

              </View>
          )}
        </TouchableOpacity>

        {/* ── Time row ──────────────────────────────────────────────────────── */}
        <View style={[styles.timeRow, { alignSelf: 'flex-end' }]}>
          {!item.isRevoked && !item.removed && (
            <>
              {item.isEdited ? (
                <Text style={[styles.edited, { color: isMe ? myMetaColor : theirMetaColor }]}>
                  ({t('messages.edited', { defaultValue: 'Đã chỉnh sửa' })})
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

          {isMe && !item.isRevoked && !item.removed && (
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
          <MessageReactions
            reactions={item.reactions}
            currentUserId={authUser?.id || ''}
            onReactionPress={(reactionType) => onReactionPress?.(item.serverMessageId || item.id, reactionType)}
            isAbsolute={true}
            isMe={isMe ?? false}
          />
        )}
      </View>

      {/* Right avatar (shown for sent messages – optional) */}
      {isMe && avatar && avatar.trim() !== '' && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}

      <EntityInfoModal
        visible={showEntityModal}
        entity={selectedEntity}
        onClose={() => setShowEntityModal(false)}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: return true if props are equal (don't re-render)
  const prev = prevProps.item;
  const next = nextProps.item;

  // Always re-render if item identity or critical fields changed
  if (prev.id !== next.id) return false;
  if (prev.type !== next.type) return false;
  if (prev.messageType !== next.messageType) return false;
  if (prev.status !== next.status) return false;
  if (prev.text !== next.text) return false;
  if (prev.timestamp !== next.timestamp) return false;
  if (prev.isRevoked !== next.isRevoked) return false;
  if (prev.isEdited !== next.isEdited) return false;
  if (prev.isPinned !== next.isPinned) return false;
  if (JSON.stringify(prev.reactions) !== JSON.stringify(next.reactions)) return false;

  // Check other props
  if (prevProps.isMultiSelectMode !== nextProps.isMultiSelectMode) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.highlightText !== nextProps.highlightText) return false;
  if (prevProps.isPinned !== nextProps.isPinned) return false;
  if (prevProps.currentUserRole !== nextProps.currentUserRole) return false;
  if (prevProps.zaiAvatarUrl !== nextProps.zaiAvatarUrl) return false;
  if (prevProps.isZaiConversation !== nextProps.isZaiConversation) return false;

  // Props are equal, skip re-render
  return true;
});

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

const markdownStylesRight = {
  body: { color: '#fff', fontSize: 15, lineHeight: 20 },
  heading1: { color: '#fff', fontSize: 20, fontWeight: '700' as const, marginVertical: 4 },
  heading2: { color: '#fff', fontSize: 18, fontWeight: '600' as const, marginVertical: 3 },
  heading3: { color: '#fff', fontSize: 16, fontWeight: '600' as const, marginVertical: 2 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  code_inline: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 4, borderRadius: 3 },
  code_block: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 6, marginVertical: 4 },
  fence: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 6, marginVertical: 4 },
  hr: { backgroundColor: 'rgba(255,255,255,0.3)', height: 1, marginVertical: 8 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.4)', paddingLeft: 8, marginVertical: 4 },
  link: { color: '#4da6ff', textDecorationLine: 'underline' as const },
  list_item: { marginVertical: 2 },
  bullet_list_icon: { color: '#fff', fontSize: 8, lineHeight: 20, marginRight: 8 },
  ordered_list_icon: { color: '#fff', fontSize: 14, lineHeight: 20, marginRight: 8 },
};

// Their/left-side Markdown (Zai replies). Theme-aware: the text/heading/list-icon
// colors were hardcoded to #1a1a1a, which is invisible on the dark-mode bubble
// (#1C1C1E). `textColor` is theme.colors.text; surfaces and borders flip on isDark.
const makeMarkdownStylesLeft = (textColor: string, isDark: boolean) => ({
  body: { color: textColor, fontSize: 15, lineHeight: 20 },
  heading1: { color: textColor, fontSize: 20, fontWeight: '700' as const, marginVertical: 4 },
  heading2: { color: textColor, fontSize: 18, fontWeight: '600' as const, marginVertical: 3 },
  heading3: { color: textColor, fontSize: 16, fontWeight: '600' as const, marginVertical: 2 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  code_inline: { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: textColor, paddingHorizontal: 4, borderRadius: 3 },
  code_block: { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textColor, padding: 8, borderRadius: 6, marginVertical: 4 },
  fence: { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textColor, padding: 8, borderRadius: 6, marginVertical: 4 },
  hr: { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)', height: 1, marginVertical: 8 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)', paddingLeft: 8, marginVertical: 4 },
  link: { color: isDark ? '#4da6ff' : '#007aff', textDecorationLine: 'underline' as const },
  list_item: { marginVertical: 2 },
  bullet_list_icon: { color: textColor, fontSize: 8, lineHeight: 20, marginRight: 8 },
  ordered_list_icon: { color: textColor, fontSize: 14, lineHeight: 20, marginRight: 8 },
});

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
  pollContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  entityAnalyzing: { fontSize: 11, fontStyle: 'italic', marginTop: 4, opacity: 0.7 },
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

  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  bubbleWithReply: {
    paddingTop: 8,
    minWidth: 220,
  },
  bubbleWithForwarded: {
    paddingTop: 4,
    paddingBottom: 8,
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

  // Multi-select styles
  containerMultiSelect: {
    paddingLeft: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 8,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderWidth: 0,
  },
  checkboxUnselected: {
    backgroundColor: 'transparent',
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleWrapperMultiSelect: {
    maxWidth: '70%',
  },

  // Translation styles
  // Voice message styles
  voiceContainer: {
    width: 220,
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voicePlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceWaveform: {
    flex: 1,
    gap: 4,
  },
  voiceProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  voiceProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  voiceBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 12,
  },
  voiceBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 2,
  },
  voiceTime: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});

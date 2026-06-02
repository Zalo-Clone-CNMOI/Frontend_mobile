import type { ConversationV2 } from '@/src/types/chat';

import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';

import { useAuth } from '@/src/contexts/AuthContext';

import { NETWORK_CONFIG } from '@/src/config/network';

import React, { useEffect, useMemo } from 'react';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';

import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pin } from 'lucide-react-native';

import { useTheme } from '../../theme/themeContext';

import { useChatStore } from '../../store/chatStore';
import { usePresenceStore } from '../../store/usePresenceStore';

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    // Replace bucket name if URL from backend uses wrong bucket
    const regex = /https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/;
    return avatar.replace(regex, NETWORK_CONFIG.S3_BASE_URL);
  }
  return `${NETWORK_CONFIG.S3_BASE_URL}/${avatar.replace(/^\//, '')}`;
};

export function ChatListItem({
  item,
  onPress,
  onLongPress,
  isPressed,
}: {
  item: ConversationV2;
  onPress: () => void;
  onLongPress?: (yPosition: number, itemHeight: number) => void;
  isPressed?: boolean;
}) {
  const itemRef = React.useRef<View>(null);
  const theme = useTheme();
  const { presenceMap } = usePresenceStore();
  const { user: authUser } = useAuth();
  const messageTime = item.lastMessage?.timestamp || item.lastMessageAt;

  const ZAI_BOT_ID = NETWORK_CONFIG.ZAI_BOT_ID;
  const isZaiChat = item.type === 'ai_assistant' || item.otherUserId === ZAI_BOT_ID;

  const fetchConversationDetail = useConversationDetailStore(s => s.fetchConversationDetail);
  const zaiMemberAvatar = useConversationDetailStore(s => {
    if (!isZaiChat) return null;
    const members = s.cache[item.conversationId]?.members;
    const zaiEntry = members?.find(m => m.userId === ZAI_BOT_ID);
    return normalizeAvatarUrl(zaiEntry?.avatarUrl || undefined);
  });

  useEffect(() => {
    if (isZaiChat && !item.avatar && !zaiMemberAvatar) {
      fetchConversationDetail(item.conversationId).catch(() => {});
    }
  }, [isZaiChat, item.avatar, item.conversationId, zaiMemberAvatar, fetchConversationDetail]);

  // Get presence status for the other user (not for groups)
  const getPresenceStatus = () => {
    if (item.isGroup || isZaiChat) return null;

    // Get the other user's ID (for direct conversations)
    const userId = item.otherUserId || item.userId;
    if (!userId) return null;

    const userPresence = presenceMap[userId];
    if (!userPresence) return null;

    // Check if presence is still valid (not expired)
    if (Date.now() > (userPresence.expires_at || 0)) return null;

    return userPresence.status;
  };



  const presenceStatus = getPresenceStatus();

  // Use nickname for direct conversations if available
  const displayName = useMemo(() => {
    if (isZaiChat) return 'Zai';
    if (!item.isGroup && item.myNickname) {
      return item.myNickname;
    }
    return item.name;
  }, [isZaiChat, item.isGroup, item.myNickname, item.name]);

  const avatarSource = useMemo(() => {
    const normalizedAvatar = normalizeAvatarUrl(item.avatar || undefined);
    if (normalizedAvatar) return { uri: normalizedAvatar };
    if (isZaiChat && zaiMemberAvatar) return { uri: zaiMemberAvatar };
    if (isZaiChat && NETWORK_CONFIG.ZAI_AVATAR_URL) return { uri: NETWORK_CONFIG.ZAI_AVATAR_URL };
    return null;
  }, [item.avatar, isZaiChat, zaiMemberAvatar]);

  const formattedLastMessage = useMemo(() => {
    const type = item.lastMessage?.type || 'text';
    const content = item.lastMessage?.content;
    const senderId = (item.lastMessage as any)?.senderId;
    const fromMe = senderId ? senderId === authUser?.id : false;

    // Determine content based on type
    let messageContent = '';
    switch (type) {
      case 'image':
        messageContent = 'đã gửi ảnh';
        break;
      case 'video':
        messageContent = 'đã gửi video';
        break;
      case 'file':
        messageContent = 'đã gửi tệp';
        break;
      case 'voice':
        messageContent = 'đã gửi tin nhắn thoại';
        break;
      case 'poll':
        messageContent = content || 'Bình chọn';
        break;
      default:
        messageContent = content || '';
    }

    // Determine prefix based on sender and chat type
    let prefix = '';
    if (fromMe) {
      prefix = 'Bạn: ';
    } else if (isZaiChat) {
      prefix = 'Zai: ';
    } else {
      const senderName = (item.lastMessage as any)?.senderName || '';
      prefix = senderName ? `${senderName}: ` : '';
    }

    return prefix + messageContent;
  }, [item.lastMessage, authUser?.id, isZaiChat]);



  return (

    <View ref={itemRef} style={{ width: '100%' }}>
      <TouchableOpacity
        style={[
          styles.chatItem,
          { borderBottomColor: theme.colors.border },
          isPressed && { backgroundColor: theme.colors.border + '40' }
        ]}
        onPress={onPress}
        onLongPress={() => {
          if (onLongPress && itemRef.current) {
            itemRef.current.measure((x, y, width, height, pageX, pageY) => {
              onLongPress(pageY, height);
            });
          }
        }}
        delayLongPress={500}
      >

      <View>

        {avatarSource ? (

          <Image source={avatarSource} style={styles.avatar} />

        ) : (

          <AvatarWithInitials name={isZaiChat ? 'Zai' : (item.name || 'User')} size={55} style={styles.avatar} />

        )}

        {presenceStatus === 'online' && <View style={[styles.onlineDot, { borderColor: theme.colors.background }]} />}

      </View>

      <View style={styles.chatContent}>

        <View style={styles.chatHeader}>

          <Text style={[styles.chatName, { color: theme.colors.text }]}>{displayName}</Text>

          <View style={styles.timeAndBadgeColumn}>

            <Text style={[styles.chatTime]}>

              {messageTime

                ? new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

                : ''}

            </Text>

            {item.pinned && (
              <Pin size={14} color="#8e8e93" style={{ transform: [{ rotate: '45deg' }], marginTop: 4 }} />
            )}

            {(item.unreadCount ?? 0) > 0 && (

              <View style={styles.unreadBadge}>

                <Text style={styles.unreadText}>

                  {(item.unreadCount ?? 0) > 99 ? '99+' : item.unreadCount}

                </Text>

              </View>

            )}

          </View>

        </View>

        <Text style={[styles.lastMsg, { color: '#8e8e93' }]} numberOfLines={1}>

          {formattedLastMessage}

        </Text>

      </View>



    </TouchableOpacity>

    </View>

  );

}



const styles = StyleSheet.create({

  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 0.5 },

  avatar: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.1)' },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  onlineDot: {

    position: 'absolute',

    right: 0,

    bottom: 2,

    width: 14,

    height: 14,

    backgroundColor: '#34c759',

    borderRadius: 7,

    borderWidth: 2.5,

  },

  chatContent: { flex: 1, marginLeft: 15 },

  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },

  chatName: { fontSize: 17, fontWeight: '500', flex: 1 },

  chatTime: { fontSize: 12 },

  timeAndBadgeColumn: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },

  unreadBadgeContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },

  lastMsg: { fontSize: 14.5 },

});


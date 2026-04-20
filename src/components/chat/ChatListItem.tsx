import type { ConversationV2 } from '@/src/types/chat';

import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';

import { useAuth } from '@/src/contexts/AuthContext';

import React from 'react';

import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme/themeContext';

import { useChatStore } from '../../store/chatStore';



export function ChatListItem({

  item,

  onPress,

}: {

  item: ConversationV2;

  onPress: () => void;

}) {

  const theme = useTheme();

  const { presence } = useChatStore();

  const { user: authUser } = useAuth();

  const messageTime = item.lastMessage?.timestamp || item.lastMessageAt;

  // Debug log
  console.log('[ChatListItem] conversation:', item.name, 'unreadCount:', item.unreadCount, 'type:', typeof item.unreadCount);



  // Get presence status for the other user (not for groups)

  const getPresenceStatus = () => {

    if (item.isGroup) return null;

    // Get the other user's ID (for direct conversations)

    const userId = item.otherUserId || item.userId;

    if (!userId) return null;

    const userPresence = presence[userId];

    if (!userPresence) return null;

    // Check if presence is still valid (not expired)

    if (Date.now() > userPresence.expires_at) return null;

    return userPresence.status;

  };



  const presenceStatus = getPresenceStatus();



  const formatLastMessage = () => {

    const type = item.lastMessage?.type || 'text';

    const content = item.lastMessage?.content;

    const senderId = (item.lastMessage as any)?.senderId;

    // Determine fromMe by comparing senderId with current user ID

    const fromMe = senderId ? senderId === authUser?.id : false;

    const isGroup = item.isGroup;



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

      default:

        messageContent = content || '';

    }



    // Determine prefix based on sender and chat type

    let prefix = '';

    if (fromMe) {

      prefix = 'Bạn: ';

    } else {

      // For both group and direct chats, show sender name

      const senderName = (item.lastMessage as any)?.senderName || '';

      prefix = senderName ? `${senderName}: ` : '';

    }



    return prefix + messageContent;

  };



  const getAvatarSource = () => {

    if (item.avatar) {

      return { uri: item.avatar };

    }

    return null;

  };



  const avatarSource = getAvatarSource();



  return (

    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: theme.colors.border }]} onPress={onPress}>

      <View>

        {avatarSource ? (

          <Image source={avatarSource} style={styles.avatar} />

        ) : (

          <AvatarWithInitials name={item.name || 'User'} size={55} style={styles.avatar} />

        )}

        {presenceStatus === 'online' && <View style={[styles.onlineDot, { borderColor: theme.colors.background }]} />}

      </View>

      <View style={styles.chatContent}>

        <View style={styles.chatHeader}>

          <Text style={[styles.chatName, { color: theme.colors.text }]}>{item.name}</Text>

          <View style={styles.timeAndBadgeColumn}>

            <Text style={[styles.chatTime]}>

              {messageTime

                ? new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

                : ''}

            </Text>

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

          {formatLastMessage()}

        </Text>

      </View>



    </TouchableOpacity>

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


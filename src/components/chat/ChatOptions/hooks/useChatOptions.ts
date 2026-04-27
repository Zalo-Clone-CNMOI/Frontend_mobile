import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { leaveConversation, disbandConversation } from '@/src/services/conversationsApi';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useMediaGallery } from './useMediaGallery';
import { useMembers } from './useMembers';
import { useNickname } from './useNickname';

interface UseChatOptionsOptions {
  visible: boolean;
  chatId: string;
  chatName: string;
  currentUserId?: string;
  isGroup?: boolean;
  memberCountProp?: number;
  onLeaveSuccess?: () => void;
  onNicknameChanged?: () => void;
}

interface UseChatOptionsReturn {
  // State
  notificationsEnabled: boolean;
  createPollModalVisible: boolean;
  conversationInvitesModalVisible: boolean;
  viewerVisible: boolean;
  viewerInitialIndex: number;
  roleSelectionVisible: boolean;

  // Data
  cacheEntry: any;
  members: any[];
  mySettings: { role: 'owner' | 'admin' | 'member'; nickname?: string };
  memberCount: number;
  myRole: 'owner' | 'admin' | 'member';
  myNickname: string;
  chatAvatar: string | null | undefined;

  // Media
  media: ReturnType<typeof useMediaGallery>;

  // Members
  membersActions: ReturnType<typeof useMembers>;

  // Nickname
  nickname: ReturnType<typeof useNickname>;

  // Actions
  setNotificationsEnabled: (value: boolean) => void;
  setCreatePollModalVisible: (value: boolean) => void;
  setConversationInvitesModalVisible: (value: boolean) => void;
  setViewerVisible: (value: boolean) => void;
  setViewerInitialIndex: (value: number) => void;
  setRoleSelectionVisible: (value: boolean) => void;
  handleLeaveGroup: () => void;
  handleDisbandGroup: () => void;
  handleAddMember: () => void;
  handleViewMembers: (onClose: () => void) => void;
  handleViewAllMedia: () => void;
  handleMediaPress: (item: any) => void;
  handleViewPolls: () => void;
  handlePollCreated: (pollId: string, messageId: string, question: string, options: any[], metadata: any) => void;
}

const EMPTY_MEMBERS: any[] = [];
const DEFAULT_SETTINGS = { role: 'member' as const };

export const useChatOptions = ({
  visible,
  chatId,
  chatName,
  currentUserId,
  isGroup,
  memberCountProp = 0,
  onLeaveSuccess,
  onNicknameChanged,
}: UseChatOptionsOptions): UseChatOptionsReturn => {
  const { t } = useTranslation();
  const router = useRouter();

  // Store subscriptions
  const cacheEntry = useConversationDetailStore((state) => state.cache[chatId]);
  const members = cacheEntry?.members || EMPTY_MEMBERS;
  const mySettings = cacheEntry?.mySettings || DEFAULT_SETTINGS;
  const cachedConversation = cacheEntry?.conversation;

  // Find current user in members list to get role
  const currentMember = members.find((m) => m.userId === currentUserId);
  const myRole = currentMember?.role || mySettings.role;
  const myNickname = mySettings.nickname || '';
  const memberCount = cachedConversation?.memberCount ?? memberCountProp;
  const chatAvatar = cachedConversation?.avatarUrl || undefined;

  // Debug log
  console.log('[useChatOptions] Role debug:', {
    chatId,
    currentUserId,
    currentMemberRole: currentMember?.role,
    cacheRole: mySettings.role,
    finalRole: myRole,
    foundInMembers: !!currentMember,
  });

  const storeFetchConversationDetail = useConversationDetailStore(
    (state) => state.fetchConversationDetail
  );

  // Local state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [createPollModalVisible, setCreatePollModalVisible] = useState(false);
  const [conversationInvitesModalVisible, setConversationInvitesModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [roleSelectionVisible, setRoleSelectionVisible] = useState(false);

  // Sub-hooks
  const media = useMediaGallery({ chatId, currentUserId });
  const membersActions = useMembers({ chatId, currentUserId, myRole });
  const nickname = useNickname({ chatId, currentNickname: myNickname });

  // Fetch data when modal opens
  useEffect(() => {
    if (visible && chatId) {
      media.fetchMedia();

      // Always force refresh for groups to get accurate role from API
      // API conversations list doesn't return myRole, so we need detail API
      if (isGroup) {
        console.log('[useChatOptions] Force refresh conversation detail for group:', chatId);
        storeFetchConversationDetail(chatId, true).catch(() => {});
      } else {
        storeFetchConversationDetail(chatId).catch(() => {});
      }
    }
  }, [visible, chatId, isGroup, storeFetchConversationDetail, media.fetchMedia]);

  // Actions
  const handleLeaveGroup = useCallback(() => {
    const isOwner = myRole === 'owner';
    Alert.alert(
      t('chat_options.leave_group'),
      isOwner
        ? t('chat_options.leave_group_owner_confirm')
        : t('chat_options.leave_group_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat_options.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveConversation(chatId);
              onLeaveSuccess?.();
              router.back();
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error.message || t('chat_options.leave_group_failed')
              );
            }
          },
        },
      ]
    );
  }, [myRole, chatId, router, onLeaveSuccess, t]);

  const handleDisbandGroup = useCallback(() => {
    Alert.alert(t('chat_options.delete_group'), t('chat_options.delete_group_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat_options.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await disbandConversation(chatId);
            onLeaveSuccess?.();
            router.back();
          } catch (error: any) {
            Alert.alert(
              t('common.error'),
              error.message || t('chat_options.leave_group_failed')
            );
          }
        },
      },
    ]);
  }, [chatId, router, onLeaveSuccess, t]);

  const handleAddMember = useCallback(() => {
    router.push({
      pathname: '/createGroup',
      params: { conversationId: chatId, mode: 'addMember' },
    } as any);
  }, [chatId, router]);

  const handleViewMembers = useCallback(
    (onClose: () => void) => {
      router.push({
        pathname: '/groupMembers',
        params: {
          conversationId: chatId,
          chatName: chatName,
          currentUserId: currentUserId,
          myRole: myRole,
        },
      } as any);
      onClose();
    },
    [chatId, chatName, currentUserId, myRole, router]
  );

  const handleViewAllMedia = useCallback(() => {
    router.push({
      pathname: '/media-gallery',
      params: { conversationId: chatId, chatName: chatName },
    });
  }, [chatId, chatName, router]);

  const handleViewPolls = useCallback(() => {
    router.push({
      pathname: '/conversationPolls',
      params: { conversationId: chatId, chatName },
    } as any);
  }, [chatId, chatName, router]);

  const handleMediaPress = useCallback(
    (item: any) => {
      const index = media.mediaItems.findIndex((m) => m.id === item.id);
      setViewerInitialIndex(index >= 0 ? index : 0);
      setViewerVisible(true);
    },
    [media.mediaItems]
  );

  const handlePollCreated = useCallback(
    (pollId: string, messageId: string, question: string, options: any[], metadata: any) => {
      const now = Date.now();

      // Update last message in chat list
      useChatsStore.getState().updateLastMessage(
        chatId,
        t('chat_options.poll_message', { question: question || t('poll.label') }),
        'poll',
        now,
        currentUserId,
        undefined,
        false
      );

      // Add optimistic poll message
      const pollMessage = {
        id: messageId,
        conversationId: chatId,
        senderId: currentUserId || '',
        senderName: t('chat.you'),
        type: 'poll' as const,
        text: t('chat_options.poll_message', { question: question || t('poll.label') }),
        timestamp: now,
        status: 'sent' as const,
        fromMe: true,
        metadata: metadata,
      };
      useMessagesStore.getState().addMessage(chatId, pollMessage);

      // Navigate to poll list
      setTimeout(() => {
        router.push({
          pathname: '/conversationPolls',
          params: { conversationId: chatId, chatName },
        } as any);
      }, 300);
    },
    [chatId, chatName, currentUserId, t, router]
  );

  return {
    // State
    notificationsEnabled,
    createPollModalVisible,
    conversationInvitesModalVisible,
    viewerVisible,
    viewerInitialIndex,
    roleSelectionVisible,

    // Data
    cacheEntry,
    members,
    mySettings,
    memberCount,
    myRole,
    myNickname,
    chatAvatar,

    // Sub-hooks
    media,
    membersActions,
    nickname,

    // Actions
    setNotificationsEnabled,
    setCreatePollModalVisible,
    setConversationInvitesModalVisible,
    setViewerVisible,
    setViewerInitialIndex,
    setRoleSelectionVisible,
    handleLeaveGroup,
    handleDisbandGroup,
    handleAddMember,
    handleViewMembers,
    handleViewAllMedia,
    handleMediaPress,
    handleViewPolls,
    handlePollCreated,
  };
};

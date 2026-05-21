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
import { canMemberDo, normalizeGroupSettings, type GroupSettings } from '@/src/types/group-settings';

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
  groupSettings: GroupSettings;
  canChangeGroupInfo: boolean;
  canCreatePoll: boolean;
  canPinMessages: boolean;
  canSendMessages: boolean;

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
  const groupSettings = normalizeGroupSettings(cacheEntry?.settings);

  // Find current user in members list to get role
  const currentMember = members.find((m) => m.userId === currentUserId);
  const myRole = currentMember?.role || mySettings.role;
  const canChangeGroupInfo = canMemberDo('change_info', myRole, groupSettings);
  const canCreatePoll = canMemberDo('create_poll', myRole, groupSettings);
  const canPinMessages = canMemberDo('pin_message', myRole, groupSettings);
  const canSendMessages = canMemberDo('send_message', myRole, groupSettings);
  const myNickname = mySettings.nickname || '';
  const memberCount = cachedConversation?.memberCount ?? memberCountProp;
  // For 1-1 conversations, get avatar from other user in members list
  // For groups, use conversation's avatarUrl
  const otherUser = !isGroup ? members.find((m) => m.userId !== currentUserId) : null;
  const chatAvatar = isGroup
    ? (cachedConversation?.avatarUrl || undefined)
    : (otherUser?.avatarUrl || cachedConversation?.avatarUrl || undefined);

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
  
  // Navigation protection states
  const [isNavigatingToMembers, setIsNavigatingToMembers] = useState(false);
  const [isNavigatingToPolls, setIsNavigatingToPolls] = useState(false);
  const [isNavigatingToMedia, setIsNavigatingToMedia] = useState(false);

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
    if (isNavigatingToMembers) {
      return;
    }

    setIsNavigatingToMembers(true);
    router.push({
      pathname: '/createGroup',
      params: { conversationId: chatId, mode: 'addMember' },
    } as any);
    
    // Reset navigation flag after a delay
    setTimeout(() => setIsNavigatingToMembers(false), 1000);
  }, [chatId, router, isNavigatingToMembers]);

  const handleViewMembers = useCallback(
    (onClose: () => void) => {
      if (isNavigatingToMembers) {
        return;
      }

      setIsNavigatingToMembers(true);
      router.push({
        pathname: '/groupMembers',
        params: {
          conversationId: chatId,
          chatName,
          currentUserId,
          myRole,
          isGroup: String(isGroup),
        },
      } as any);
      onClose();
      
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigatingToMembers(false), 300);
    },
    [chatId, chatName, currentUserId, myRole, isGroup, router, isNavigatingToMembers]
  );

  const handleViewAllMedia = useCallback(() => {
    if (isNavigatingToMedia) {
      return;
    }

    setIsNavigatingToMedia(true);
    router.push({
      pathname: '/media-gallery',
      params: { conversationId: chatId, chatName: chatName },
    });
    
    // Reset navigation state after a short delay
    setTimeout(() => setIsNavigatingToMedia(false), 300);
  }, [chatId, chatName, router, isNavigatingToMedia]);

  const handleViewPolls = useCallback(() => {
    if (isNavigatingToPolls) {
      return;
    }

    setIsNavigatingToPolls(true);
    router.push({
      pathname: '/conversationPolls',
      params: { conversationId: chatId, chatName },
    } as any);
    
    // Reset navigation state after a short delay
    setTimeout(() => setIsNavigatingToPolls(false), 300);
  }, [chatId, chatName, router, isNavigatingToPolls]);

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
    groupSettings,
    canChangeGroupInfo,
    canCreatePoll,
    canPinMessages,
    canSendMessages,

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

import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { ChatOptions } from '@/src/components/chat/ChatOptions';
import { ForwardModal } from '@/src/components/chat/ForwardModal';
import { GroupInfoModal } from '@/src/components/chat/GroupInfoModal';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { MemberRoleModal } from '@/src/components/chat/MemberRoleModal';
import { MessageActionMenu } from '@/src/components/chat/MessageActionMenu';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { PinnedMessagesSection } from '@/src/components/chat/PinnedMessagesSection';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { VideoViewer } from '@/src/components/chat/VideoViewer';
import { PresenceIndicator } from '@/src/components/common/PresenceIndicator';
import { useAuth } from '@/src/contexts/AuthContext';
import { useChatDetailScreenLogic } from '@/src/hooks/screens/useChatDetailScreen';
import { useMessagePin } from '@/src/hooks/useMessagePin';
import { getMessageReactions } from '@/src/services/chatService';
import * as mediaService from '@/src/services/mediaService';
import { translationService } from '@/src/services/ai/TranslationService';
import { lookupMessage, getPinnedMessages } from '@/src/services/messagesApi';
import { mapPinnedMessagesListFromApi } from '@/src/types/mappers/DTOMappers';
import { searchUsers } from '@/src/services/usersApi';
import { summaryService } from '@/src/services/ai/SummaryService';
import { SummaryModal } from '@/src/components/chat/SummaryModal';
import { EntityInfoModal } from '@/src/components/chat/EntityInfoModal';
import { useEntityDetectionStore } from '@/src/store/useEntityDetectionStore';
import { useAITranslationStore } from '@/src/store/useAITranslationStore';
import { useAISmartReplyStore } from '@/src/store/useAISmartReplyStore';
import { useChatStore } from '@/src/store/chatStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useTheme } from '@/src/theme/themeContext';
import { useCallService } from '@/src/services/callService';
import { resolveCallRecipientIds } from '@/src/services/callParticipants';
import { useCallStore } from '@/src/store/useCallStore';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Bell, ChevronDown, ChevronUp, Circle, Forward, List, Phone, Search, Sparkles, Video, X } from 'lucide-react-native';
import { AvatarWithPresence } from '@/src/components/common/AvatarWithPresence';
import { PresenceText } from '@/src/components/common/PresenceIndicator';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { leaveConversation, addMember, markAsRead, getConversationDetail, disbandConversation } from '@/src/services/conversationsApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { canMemberDo, normalizeGroupSettings } from '@/src/types/group-settings';
import { useInAppNotification } from '@/src/notifications/useInAppNotification';
import { NotificationBanner } from '@/src/components/notifications/NotificationBanner';
import { setCurrentConversationId } from '@/src/hooks/useNotificationListener';

export default function ChatDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { initiateCall } = useCallService();
  const callState = useCallStore((state) => state.callState);
  const { notification, showInfo, showSuccess, showError, hideNotification } = useInAppNotification();
  const fetchConversationDetail = useConversationDetailStore((state) => state.fetchConversationDetail);
  const getMySettings = useConversationDetailStore((state) => state.getMySettings);
  const getMembers = useConversationDetailStore((state) => state.getMembers);
  const setMessageReactions = useMessagesStore((state) => state.setMessageReactions);
  const messageCount = useMessagesStore((state) => (state.messagesByChatId[chatId || '']?.length) ?? 0);
  const deleteChat = useChatsStore((state) => state.deleteChat);
  const { pinMessage, unpinMessage, isMessagePinned } = useMessagePin();

  // Handle successful leave group - remove conversation from list
  const handleLeaveSuccess = () => {
    deleteChat(chatId);
  };

  const {
    chatId,
    currentChat,
    flashListRef,
    handleLoadMore,
    handleSendFiles,
    handleTypingStart,
    handleTypingStop,
    input,
    keyboardOffset,
    listBottomPadding,
    messages,
    onSend,
    editingMessage,
    handleCancelEdit,
    handleReuseRevokedMessage,
    handleRevokedRestoreExpired,
    handleJumpToReplySource,
    openMessageActions,
    replyingMessage,
    selectedImage,
    selectedImageUrls,
    selectedImageIndex,
    selectedVideo,
    setInput,
    setReplyingMessage,
    setSelectedImage,
    setSelectedImageUrls,
    setSelectedImageIndex,
    setSelectedVideo,
    setShowChatOptions,
    showChatOptions,
    title,
    typingText,
    typingUsers,
    isTypingVisible,
    presence,
    closeMessageActions,
    handleReplyAction,
    handleEditAction,
    handleDeleteAction,
    handleReactAction,
    handleReactMultiple,
    handleUnreactAction,
    handleForwardAction,
    handleForward,
    selectedActionMessage,
    isMessageActionMenuVisible,
    isForwardModalVisible,
    setIsForwardModalVisible,
    // Multi-select
    isMultiSelectMode,
    setIsMultiSelectMode,
    selectedMessageIds,
    setSelectedMessageIds,
    enterMultiSelectMode,
    exitMultiSelectMode,
    toggleMessageSelection,
    selectAllMessages,
    selectedMessages,
    handleBatchForward,
    handleBatchForwardMessages,
    // Search
    isSearchMode,
    toggleSearchMode,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearchMessages,
    clearSearch,
    currentSearchIndex,
    navigateSearchResult,
    highlightedMessageId,
    setHighlightedMessageId,
    jumpToMessage,
  } = useChatDetailScreenLogic();

  const conversationCacheEntry = useConversationDetailStore((state) => state.cache[chatId]);

  // Local state for members to avoid infinite loop - initialized after chatId is available
  const [members, setMembers] = useState(() => getMembers(chatId));
  const rawSettings = conversationCacheEntry?.settings;
  const groupSettings = normalizeGroupSettings(rawSettings);
  
  // getMySettings from store, default to 'member' if not loaded yet
  const myGroupRole = getMySettings(chatId)?.role || 'member';
  
  // Check if settings is loaded from server (not using defaults)
  const settingsLoaded = rawSettings != null;
  
  // DEBUG: Log cache read details
  console.log('[Permissions] conversationCacheEntry?.settings:', rawSettings, 'type:', typeof rawSettings);
  console.log('[Permissions] getMySettings role:', getMySettings(chatId)?.role, 'normalized role:', myGroupRole);
  
  // For direct chats: always allow. For groups: owner/admin always allow (even if settings not loaded yet).
  const canPinMessages = currentChat && !currentChat.isGroup
    ? true
    : (myGroupRole === 'owner' || myGroupRole === 'admin')
      ? true
      : (settingsLoaded ? canMemberDo('pin_message', myGroupRole, groupSettings) : false);
  const canSendMessages = currentChat && !currentChat.isGroup
    ? true
    : (myGroupRole === 'owner' || myGroupRole === 'admin')
      ? true
      : (settingsLoaded ? canMemberDo('send_message', myGroupRole, groupSettings) : false);
  
  // DEBUG: Log decision path
  const isDirect = currentChat && !currentChat.isGroup;
  const isPrivileged = myGroupRole === 'owner' || myGroupRole === 'admin';
  console.log('[Permissions] canSendMessages:', canSendMessages, '| isDirect:', isDirect, '| isPrivileged:', isPrivileged, '| settingsLoaded:', settingsLoaded);
  
  // Sync members from store when cache changes using Zustand subscription
  useEffect(() => {
    // Initial sync
    setMembers(getMembers(chatId));
    
    // Subscribe to store changes
    const unsubscribe = useConversationDetailStore.subscribe((state) => {
      const newMembers = state.cache[chatId]?.members || [];
      setMembers(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newMembers)) {
          return newMembers;
        }
        return prev;
      });
    });
    
    return unsubscribe;
  }, [chatId]);

  // Group management state
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showMemberRoleModal, setShowMemberRoleModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  
  // Pinned messages state
  const [pinnedMessages, setPinnedMessagesList] = useState<any[]>([]);
  const [showPinnedSection, setShowPinnedSection] = useState(false);
  
  // Chat options navigation protection
  const [isOpeningChatOptions, setIsOpeningChatOptions] = useState(false);

  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Entity detection state
  const [showEntityInfoModal, setShowEntityInfoModal] = useState(false);
  const [selectedEntityItem, setSelectedEntityItem] = useState<any>(null);
  const entitiesByMessage = useEntityDetectionStore((s) => s.entitiesByMessage);

  // DEV: inject mock translations for UI testing
  useEffect(() => {
    if (!messages?.length) return;
    const store = useAITranslationStore.getState();
    let count = 0;
    for (const msg of messages) {
      if (count >= 5) break;
      const text = msg.text || msg.content || '';
      if (!text.trim() || msg.isRevoked || msg.removed) continue;
      const key = `${msg.id}_vi`;
      if (store.cache.has(key)) continue;
      store.setTranslation(
        msg.id,
        'vi',
        text,
        `[Mock EN] Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore. ${text.slice(0, 40)}...`,
      );
      count++;
    }
    console.log(`[Mock] Injected ${count} translations`);
  }, [messages]);

  // DEV: inject mock smart reply suggestions for UI testing
  useEffect(() => {
    if (!chatId) return;
    const store = useAISmartReplyStore.getState();
    if (store.suggestions.has(chatId)) return;
    store.setSuggestions(chatId, [
      'Ok bạn, để tôi xem lại',
      'Cảm ơn bạn đã hỗ trợ nhiệt tình!',
      'Tôi sẽ kiểm tra và phản hồi lại sau',
    ]);
    console.log('[Mock] Injected smart reply suggestions');
  }, [chatId]);

  // Load pinned messages when chat loads
  useEffect(() => {
    if (chatId && chatId !== '') {
      // Fetch conversation detail to get members data
      fetchConversationDetail(chatId, true).catch(err => {
        console.error('[ChatDetail] Failed to fetch conversation detail:', err);
      });

      getPinnedMessages(chatId, 20)
        .then((response) => {
          const items = response?.data?.items || [];

          // Map API response to ChatMessage format
          const mappedItems = mapPinnedMessagesListFromApi(items, authUser?.id);
          setPinnedMessagesList(mappedItems);
          setShowPinnedSection(mappedItems.length > 0);

          // Populate store with pinned message IDs
          const setPinnedMessagesInStore = useMessagesStore.getState().setPinnedMessages;
          const pinnedIds = mappedItems.map((item) => item.message.id);
          setPinnedMessagesInStore(chatId, pinnedIds);
        })
        .catch((err) => {
          console.error('[Load pinned messages] Error:', err);
        });
    }
  }, [chatId]);

  // Mark conversation as read when entering chat
  useEffect(() => {
    if (chatId && chatId !== '') {
      markAsRead(chatId)
        .then(() => {
          // Reset unread count in local store
          useChatsStore.getState().resetUnreadCount(chatId);
        })
        .catch((err) => {/* Mark as read failed */});
    }
  }, [chatId]);

  // Track current conversation for notification suppression
  useEffect(() => {
    if (chatId) {
      setCurrentConversationId(chatId);
    }
    return () => {
      setCurrentConversationId(null);
    };
  }, [chatId]);

  // Navigate to original conversation when clicking on forwarded message header
  const handleNavigateToForwarded = React.useCallback(async (forwardedFrom: any) => {
    try {
      if (!forwardedFrom?.source_conversation_id) {
        Alert.alert('Lỗi', 'Không tìm thấy cuộc trò chuyện gốc');
        return;
      }

      // If already in the same conversation, try to scroll to original message
      if (forwardedFrom.source_conversation_id === chatId) {
        // Use lookup API to find message details
        const response = await lookupMessage(forwardedFrom.source_message_id);
        const messageData = response?.data;

        if (messageData) {
          // Jump to the original message in current list
          const currentMessages = useMessagesStore.getState().messagesByChatId[chatId] || [];
          const messageIndex = currentMessages.findIndex(m =>
            m.serverMessageId === forwardedFrom.source_message_id ||
            m.id === forwardedFrom.source_message_id
          );

          if (messageIndex >= 0 && flashListRef.current) {
            flashListRef.current.scrollToIndex({
              index: messageIndex,
              animated: true,
              viewPosition: 0.5,
            });
            // Highlight the message briefly
            setHighlightedMessageId(forwardedFrom.source_message_id);
            setTimeout(() => setHighlightedMessageId(null), 2000);
          } else {
            Alert.alert('Thông báo', 'Tin nhắn gốc không có trong danh sách hiện tại');
          }
        }
      } else {
        // Navigate to different conversation
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: forwardedFrom.source_conversation_id,
            name: forwardedFrom.source_sender_name_snapshot,
            jumpToMessageId: forwardedFrom.source_message_id,
          }
        });
      }
    } catch (error) {
      console.error('[handleNavigateToForwarded] Error:', error);
      Alert.alert('Lỗi', 'Không thể chuyển đến cuộc trò chuyện gốc');
    }
  }, [chatId, flashListRef, router, setHighlightedMessageId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleFilePress = async (item: any) => {
    try {
      if (!authUser?.id) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để tải file');
        return;
      }

      if (!item.fileInfo?.uri && !item.attachments?.[0]?.key) {
        Alert.alert('Lỗi', 'Không tìm thấy file để tải');
        return;
      }

      const key = item.fileInfo?.uri || item.attachments?.[0]?.key;
      const visibility = item.attachments?.[0]?.visibility || 'private';
      const fileName = item.fileInfo?.name || item.attachments?.[0]?.name || 'file';
      
      let downloadUrl: string;
      
      // If key is already a full URL (starts with http), use it directly
      if (key.startsWith('http://') || key.startsWith('https://')) {
        downloadUrl = key;
      } else if (visibility === 'public') {
        downloadUrl = mediaService.resolveMediaUrl(key);
      } else {
        downloadUrl = await mediaService.getAttachmentUrl(
          { key, visibility },
          authUser.id
        );
      }

      
      // Open file in browser for download
      try {
        await WebBrowser.openBrowserAsync(downloadUrl);
      } catch (error) {
        // Fallback to Linking.openURL if WebBrowser fails
        try {
          await Linking.openURL(downloadUrl);
        } catch (e: any) {
          Alert.alert('Lỗi', 'Không thể mở file: ' + e.message);
        }
      }
    } catch (error) {
      console.error('[handleFilePress] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải tệp');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleLoadReactions = async (messageId: string) => {
    try {
      const reactions = await getMessageReactions(messageId);
      if (reactions) {
        // Convert backend format to UI format
        const reactionsMap: Record<string, string[]> = {};
        reactions.summary.forEach((summary) => {
          reactionsMap[summary.type] = summary.userIds;
        });
        
        // Update message in store with reactions
        setMessageReactions(chatId, messageId, reactionsMap);
      }
    } catch (error) {
      // Error loading reactions
    }
  };

  const handlePinAction = async (message: any) => {
    try {
      await pinMessage(chatId, message.timestamp || message.createdAt, message.id);
      // Refresh pinned messages list
      const response = await getPinnedMessages(chatId, 20);
      const items = response?.data?.items || [];
      const mappedItems = mapPinnedMessagesListFromApi(items, authUser?.id);
      setPinnedMessagesList(mappedItems);
      setShowPinnedSection(mappedItems.length > 0);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể ghim tin nhắn');
    }
  };

  const handleUnpinAction = async (message: any) => {
    try {
      const messageId = message.messageId || message.id;
      const createdAt = message.createdAt || message.timestamp;
            
      await unpinMessage(chatId, createdAt, messageId);
      // Refresh pinned messages list
      const response = await getPinnedMessages(chatId, 20);
      const items = response?.data?.items || [];
      const mappedItems = mapPinnedMessagesListFromApi(items, authUser?.id);
      setPinnedMessagesList(mappedItems);
      setShowPinnedSection(mappedItems.length > 0);
    } catch (error: any) {
      console.error('[Unpin Message] Error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể bỏ ghim tin nhắn');
    }
  };

  const handlePinMessagePress = (pinnedMessage: any) => {
    // Find the message in the current messages list
    const currentMessages = messages || [];
    const messageData = pinnedMessage.message || pinnedMessage;
    const messageId = messageData.messageId || messageData.id || pinnedMessage.message_id || pinnedMessage.id;
    
    const messageIndex = currentMessages.findIndex(m =>
      m.serverMessageId === messageId ||
      m.id === messageId ||
      m.id === messageData.messageId
    );

    if (messageIndex >= 0 && flashListRef.current) {
      flashListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    } else {
      Alert.alert('Thông báo', 'Tin nhắn không có trong danh sách hiện tại');
    }
  };

  const handleStartVoiceCall = async () => {
    if (!currentChat) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin cuộc trò chuyện');
      return;
    }

    if (callState !== 'idle') {
      Alert.alert('Cuộc gọi', 'Bạn đang có một cuộc gọi khác.');
      return;
    }

    try {
      const recipientIds = await resolveCallRecipientIds(
        chatId,
        currentChat,
        authUser?.id || '',
      );

      if (!recipientIds.length) {
        Alert.alert('Lỗi', 'Không xác định được người nhận cuộc gọi.');
        return;
      }

      await initiateCall({
        conversationId: chatId,
        callType: 'audio',
        recipientIds,
      });

      router.push({
        pathname: '/call/calling',
        params: {
          recipientName: title,
          recipientAvatar: currentChat?.avatar || '',
          callType: 'audio',
        },
      } as any);
    } catch (error) {
      console.error('[ChatDetail] Failed to initiate call:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi. Vui lòng thử lại.');
    }
  };

  const handleStartVideoCall = async () => {
    if (!currentChat) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin cuộc trò chuyện');
      return;
    }

    if (callState !== 'idle') {
      Alert.alert('Cuộc gọi', 'Bạn đang có một cuộc gọi khác.');
      return;
    }

    try {
      const recipientIds = await resolveCallRecipientIds(
        chatId,
        currentChat,
        authUser?.id || '',
      );

      if (!recipientIds.length) {
        Alert.alert('Lỗi', 'Không xác định được người nhận cuộc gọi.');
        return;
      }

      await initiateCall({
        conversationId: chatId,
        callType: 'video',
        recipientIds,
      });

      router.push({
        pathname: '/call/calling',
        params: {
          recipientName: title,
          recipientAvatar: currentChat?.avatar || '',
          callType: 'video',
        },
      } as any);
    } catch (error) {
      console.error('[ChatDetail] Failed to initiate video call:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi video.');
    }
  };

  const handleOpenSearch = () => {
    setShowChatOptions(false);
    toggleSearchMode();
  };

  const handleOpenChatOptions = () => {
    if (isOpeningChatOptions) {
      return;
    }
    
    setIsOpeningChatOptions(true);
    router.push(`/chatOptions/${chatId}?name=${encodeURIComponent(title)}&isGroup=${currentChat?.isGroup ? 'true' : 'false'}` as any);
    
    // Reset opening state after a short delay
    setTimeout(() => setIsOpeningChatOptions(false), 300);
  };

  const handleSummarizeChat = () => {
    if (chatId) {
      setShowSummaryModal(true);
      summaryService.requestSummary({
        conversationId: chatId,
        messageCount: 200,
      });
    }
  };

  const handleEntityPress = useCallback((entity: any) => {
    setSelectedEntityItem(entity);
    setShowEntityInfoModal(true);
  }, []);

  const handleTranslate = useCallback((message: any) => {
    if (authUser?.id && chatId && message.text) {
      const cached = translationService.getCachedTranslation(message.id, 'vi');
      if (!cached) {
        translationService.requestTranslation({
          conversationId: chatId,
          userId: authUser.id,
          messageId: message.id,
          body: message.text,
        });
      }
    }
  }, [authUser?.id, chatId]);

  // Handle search input change with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        handleSearchMessages(text);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      clearSearch();
    }
  };

  const handleViewProfile = async () => {
    // Try multiple possible property names
    let otherUserId = 
      (currentChat as any)?.otherUserId ||
      (currentChat as any)?.userId ||
      (currentChat as any)?.recipientId ||
      (currentChat as any)?.partnerId ||
      (currentChat as any)?.other_user_id;
    
    // If not found in chat object, try to get from messages
    if (!otherUserId && messages && messages.length > 0) {
      const otherUserMessage = messages.find(msg => msg.senderId !== authUser?.id);
      if (otherUserMessage) {
        otherUserId = otherUserMessage.senderId;
      }
    }
    
    // If still not found, try to search user by name from currentChat
    if (!otherUserId && (currentChat as any)?.name) {
      try {
        const response = await searchUsers((currentChat as any).name);
        
        if (response?.data && Array.isArray(response.data)) {
          const foundUser = response.data.find((user: any) => user.id !== authUser?.id);
          if (foundUser) {
            otherUserId = foundUser.id || foundUser.userId;
          }
        }
      } catch (error: any) {
        // Error searching user by name
      }
    }
    
    if (!otherUserId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }
    
    // Navigate to user profile page
    router.push({ pathname: '/profile/[userId]', params: { userId: otherUserId } } as any);
  };

  const handleChangeWallpaper = () => {
    Alert.alert('Đổi hình nền', 'Tính năng đổi hình nền sẽ được triển khai sau');
  };

  const handleToggleNotifications = (enabled: boolean) => {
    Alert.alert(
      'Thông báo',
      enabled ? 'Bật thông báo' : 'Tắt thông báo',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'OK', onPress: () => { /* TODO: Implement toggle notifications */ } }
      ]
    );
  };

  const handleDeleteHistory = () => {
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc muốn xóa lịch sử chat này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => { /* TODO: Implement delete history */ } }
      ]
    );
  };

  // Group management handlers
  const handleEditGroupInfo = () => {
    setShowGroupInfoModal(true);
  };

  const handleViewMembers = () => {
    // Members are already loaded in currentChat from getConversationById
    const members = (currentChat as any)?.members || [];
    
    if (members.length === 0) {
      Alert.alert('Thông báo', 'Không có thông tin thành viên. Vui lòng thử lại sau.');
      return;
    }
    
    // Format members to match MemberRoleModal interface
    const formattedMembers = members.map((m: any) => ({
      id: m.userId || m.id,
      userId: m.userId || m.id,
      fullName: m.fullName || m.name || 'Unknown',
      avatarUrl: m.avatarUrl,
      role: m.role || 'member',
    }));
    
    setGroupMembers(formattedMembers);
    setShowMemberRoleModal(true);
  };

  const handleAddMember = () => {
    // Navigate to create group screen with add member mode
    router.push({
      pathname: '/createGroup',
      params: {
        conversationId: chatId,
        mode: 'addMember',
      }
    } as any);
  };

  const handleLeaveGroup = async () => {
    // Fetch fresh role from API to determine if user is owner
    try {
      const response = await getConversationDetail(chatId);
      
      const data = response.data?.data;
      // Backend bug: mySettings.role is inconsistent with members array
      // Use role from members list as fallback
      const myMemberEntry = data?.members?.find((m: any) => m.userId === authUser?.id);
      const roleFromMembers = myMemberEntry?.role || 'member';
      const roleFromSettings = data?.mySettings?.role || 'member';
      
      // Use role from members list if it differs from mySettings (backend bug workaround)
      const myRole = (roleFromMembers !== roleFromSettings) ? roleFromMembers : roleFromSettings;
      const isOwner = myRole === 'owner';

      Alert.alert(
        isOwner ? 'Xóa nhóm' : 'Rời nhóm',
        isOwner
          ? 'Bạn có chắc muốn xóa nhóm này? Hành động này không thể hoàn tác.'
          : 'Bạn có chắc muốn rời khỏi nhóm này?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: isOwner ? 'Xóa' : 'Rời',
            style: 'destructive',
            onPress: async () => {
              try {
                if (isOwner) {
                  await disbandConversation(chatId);
                } else {
                  await leaveConversation(chatId);
                }
                router.back();
              } catch (error: any) {
                Alert.alert('Lỗi', error.message || 'Không thể thực hiện thao tác');
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kiểm tra quyền hạn');
    }
  };

  // Get presence status for the other user (not for groups)
  const getPresenceStatus = () => {
    if (currentChat?.isGroup) return null;
    const userId = (currentChat as any)?.otherUserId || (currentChat as any)?.userId;
    if (!userId) return null;
    const userPresence = presence[userId];
    if (!userPresence) return null;
    // Check if presence is still valid (not expired)
    if (Date.now() > userPresence.expires_at) return null;
    return userPresence.status;
  };

  const presenceStatus = getPresenceStatus();

  const renderItem = React.useCallback(({ item }: { item: any }) => {
    const messageEntities = entitiesByMessage.get(item.id) || undefined;
    return (
      <MessageBubble
        item={item}
        conversationId={chatId}
        isGroup={currentChat?.isGroup}
        currentUserRole={currentChat?.myRole}
        conversationMembers={members}
        highlightText={isSearchMode ? searchQuery : undefined}
        onLongPress={openMessageActions}
        onReuseRevoked={handleReuseRevokedMessage}
        onRevokeRestoreExpired={handleRevokedRestoreExpired}
        onPressReply={handleJumpToReplySource}
        onReactionPress={(messageId, reactionType) => {
          // Load reactions when user taps on a reaction
          handleLoadReactions(messageId);
          // Then handle the unreact action
          handleUnreactAction(messageId, reactionType);
        }}
        onImagePress={(uri, urls, index = 0) => {
          setSelectedImage(uri);
          if (urls && urls.length > 1) {
            setSelectedImageUrls(urls);
            setSelectedImageIndex(index);
          } else {
            setSelectedImageUrls([]);
            setSelectedImageIndex(0);
          }
        }}
        onVideoPress={setSelectedVideo}
        onFilePress={handleFilePress}
        onForwardPress={handleForwardAction}
        onNavigateToForwarded={handleNavigateToForwarded}
        isPinned={isMessagePinned(chatId, item.id)}
        // Multi-select props
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedMessageIds.has(item.id)}
        onToggleSelection={toggleMessageSelection}
        // Messages for reply lookup
        messages={messages}
        // Entity detection
        entities={messageEntities}
        onEntityPress={handleEntityPress}
      />
    );
  }, [
    openMessageActions,
    handleReuseRevokedMessage,
    handleRevokedRestoreExpired,
    handleJumpToReplySource,
    handleUnreactAction,
    setSelectedImage,
    setSelectedImageUrls,
    setSelectedImageIndex,
    setSelectedVideo,
    handleFilePress,
    handleLoadReactions,
    handleForwardAction,
    handleNavigateToForwarded,
    currentChat,
    isSearchMode,
    searchQuery,
    chatId,
    isMessagePinned,
    members,
    isMultiSelectMode,
    selectedMessageIds,
    toggleMessageSelection,
    messages,
    entitiesByMessage,
    handleEntityPress,
  ]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NotificationBanner
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        duration={3000}
        onClose={hideNotification}
        onPress={notification.onPress}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: {
            backgroundColor: theme.colors.statusBar,
          },
          headerTintColor: theme.colors.textHeader,
          headerTitle: () => {
            // Multi-select mode header
            if (isMultiSelectMode) {
              return (
                <View style={styles.headerTitleContainer}>
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
                      {t('forward.selectedCount', { count: selectedMessageIds.size, defaultValue: `Đã chọn: ${selectedMessageIds.size}` })}
                    </Text>
                  </View>
                </View>
              );
            }

            // Get other user info for direct chat
            const otherUserId = (currentChat as any)?.otherUserId ||
                   (currentChat as any)?.userId ||
                   (currentChat as any)?.recipientId ||
                   (currentChat as any)?.partnerId ||
                   (currentChat as any)?.contactId ||
                   (currentChat as any)?.members?.[0]?.userId ||
                   (currentChat as any)?.members?.[0]?.id ||
                   (messages && messages.length > 0 ? messages.find((m: any) => !m.fromMe)?.senderId : undefined);
            const otherUserPresence = otherUserId ? presence[otherUserId] : null;
            const isGroup = currentChat?.isGroup ?? false;

            return (
              <View style={styles.headerTitleContainer}>
                {/* Title and Status - Giông Zalo, không có avatar */}
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
                    {title}
                  </Text>
                  {!isGroup && otherUserPresence && (
                    <View style={styles.headerPresenceContainer}>
                      <PresenceIndicator
                        status={otherUserPresence?.status || 'offline'}
                        size="small"
                        showBorder={false}
                      />
                      <PresenceText
                        status={otherUserPresence?.status || 'offline'}
                        lastSeenAt={otherUserPresence?.last_seen_at}
                      />
                    </View>
                  )}
                  {isGroup && (
                    <Text style={[styles.headerSubtitle, { color: theme.colors.icon || '#8E8E93', opacity: 0.7 }]}>
                      {(currentChat as any)?.memberCount || 0} thành viên
                    </Text>
                  )}
                </View>
              </View>
            );
          },
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              {isMultiSelectMode ? (
                <TouchableOpacity style={styles.callButton} onPress={exitMultiSelectMode}>
                  <Text style={[styles.cancelButtonText, { color: theme.colors.primary }]}>
                    {t('common.cancel', { defaultValue: 'Hủy' })}
                  </Text>
                </TouchableOpacity>
              ) : !isSearchMode && (
                <>
                  {messageCount > 10 && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={handleSummarizeChat}
                    >
                      <Sparkles size={20} color={theme.colors.iconHeader} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={handleStartVoiceCall}
                  >
                    <Phone size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={handleStartVideoCall}
                  >
                    <Video size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callButton} onPress={handleOpenSearch}>
                    <Search size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callButton} onPress={handleOpenChatOptions}>
                    <List size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 0}
      >
        {/* Search UI - Zalo Style */}
        {showPinnedSection && !isSearchMode && canPinMessages && (
          <PinnedMessagesSection
            pinnedMessages={pinnedMessages}
            onPressMessage={handlePinMessagePress}
            onUnpinMessage={handleUnpinAction}
            conversationId={chatId}
            canPinMessages={canPinMessages}
          />
        )}

        {isSearchMode && (
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card }]}>
              <Search size={18} color={theme.colors.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Tìm kiếm tin nhắn..."
                placeholderTextColor={theme.colors.icon}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <X size={18} color={theme.colors.icon} />
                </TouchableOpacity>
              )}

              {/* Navigation counter */}
              {searchResults.length > 0 && (
                <Text style={[styles.searchCounter, { color: theme.colors.text }]}>
                  {currentSearchIndex + 1}/{searchResults.length}
                </Text>
              )}

              {/* Navigation buttons */}
              {searchResults.length > 0 && (
                <View style={styles.searchNavButtons}>
                  <TouchableOpacity
                    onPress={() => navigateSearchResult('prev')}
                    style={styles.searchNavButton}
                  >
                    <ChevronUp size={20} color={theme.colors.icon} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigateSearchResult('next')}
                    style={styles.searchNavButton}
                  >
                    <ChevronDown size={20} color={theme.colors.icon} />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={toggleSearchMode} style={styles.closeSearchButton}>
                <Text style={[styles.closeSearchText, { color: theme.colors.primary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
            {isSearching && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.searchLoadingText, { color: theme.colors.icon }]}>
                  Đang tìm kiếm...
                </Text>
              </View>
            )}
          </View>
        )}

        <FlashList
          ref={flashListRef}
          data={isSearchMode ? searchResults : messages}
          extraData={messages} // Force re-render when messages array changes
          keyExtractor={(item, index) => String(item.id || `${item.conversationId || 'chat'}:${item.senderId || ''}:${item.timestamp || 0}:${item.text || ''}:${index}`)}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          onStartReached={!isSearchMode ? handleLoadMore : undefined}
          onStartReachedThreshold={0.2}
          renderItem={({ item }: { item: any }) => (
            <View style={[
              highlightedMessageId === item.id && styles.highlightedMessage
            ]}>
              {renderItem({ item })}
            </View>
          )}
          ListEmptyComponent={isSearchMode && searchQuery.length > 0 && !isSearching ? (
            <View style={styles.emptySearchContainer}>
              <Text style={[styles.emptySearchText, { color: theme.colors.icon }]}>
                Không tìm thấy tin nhắn nào cho {searchQuery}
              </Text>
            </View>
          ) : null}
        />

        {/* Multi-select action bar */}
        {isMultiSelectMode && (
          <View style={[styles.multiSelectBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.multiSelectAction}
              onPress={selectAllMessages}
            >
              <Text style={[styles.multiSelectActionText, { color: theme.colors.primary }]}>
                {t('common.select_all', { defaultValue: 'Chọn tất cả' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.multiSelectAction, selectedMessageIds.size === 0 && styles.multiSelectActionDisabled]}
              onPress={handleBatchForward}
              disabled={selectedMessageIds.size === 0}
            >
              <Forward size={24} color={selectedMessageIds.size === 0 ? theme.colors.icon : theme.colors.primary} />
              <Text style={[styles.multiSelectActionText, { color: selectedMessageIds.size === 0 ? theme.colors.icon : theme.colors.primary }]}>
                {t('forward.title', { defaultValue: 'Chia sẻ' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View>
          {isTypingVisible && !isMultiSelectMode ? <TypingIndicator text={typingText} /> : null}
          {/* DEBUG: Log before render decision */}
          {console.log('[ChatComposer render] canSendMessages =', canSendMessages, 'type:', typeof canSendMessages, '!!canSendMessages:', !!canSendMessages) || true}
          {!isMultiSelectMode && canSendMessages ? (
            <ChatComposer
              value={input}
              onChangeText={setInput}
              onSend={onSend}
              onSendFiles={handleSendFiles}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
            editingTo={
              editingMessage
                ? {
                    text: editingMessage.text || '',
                  }
                : null
            }
            onCancelEdit={handleCancelEdit}
            replyingTo={
              replyingMessage
                ? {
                    senderName: replyingMessage.fromMe ? 'Ban' : title,
                    text: replyingMessage.isRevoked ? 'Tin nhắn đã thu hồi' : replyingMessage.text || '',
                  }
                : null
            }
            onCancelReply={() => setReplyingMessage(null)}
              conversationId={chatId}
              userId={authUser?.id}
              onSmartReplyDismiss={() => {
                import('@/src/services/ai/SmartReplyService').then(({ smartReplyService }) => {
                  smartReplyService.clearSuggestions(chatId);
                });
              }}
            />
          )}
          {!isMultiSelectMode && !canSendMessages && (
            <View style={[styles.readOnlyComposer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
              <Text style={[styles.readOnlyComposerText, { color: theme.colors.icon }]}>
                {t('group_settings.send_message_disabled', { defaultValue: 'Chỉ quản trị viên được gửi tin nhắn trong nhóm này.' })}
              </Text>
            </View>
          )}
        </View>

        <ImageViewer
          visible={!!selectedImage}
          uri={selectedImage}
          uris={selectedImageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageUrls([]);
            setSelectedImageIndex(0);
          }}
        />
        <VideoViewer visible={!!selectedVideo} uri={selectedVideo} onClose={() => setSelectedVideo(null)} />
        <ChatOptions
          visible={showChatOptions}
          onClose={() => setShowChatOptions(false)}
          chatId={chatId}
          chatName={title}
          chatAvatar={currentChat?.avatar || undefined}
          currentUserId={authUser?.id}
          otherUserId={(currentChat as any)?.otherUserId || (currentChat as any)?.userId}
          isGroup={currentChat?.isGroup ?? false}
          // isOwner and myRole props are deprecated - ChatOptions fetches fresh role from API
          isOwner={false} // Not used anymore, kept for compatibility
          memberCount={currentChat?.memberCount ?? 0}
          onSearchMessages={handleOpenSearch}
          onViewProfile={handleViewProfile}
          onChangeWallpaper={handleChangeWallpaper}
          onToggleNotifications={handleToggleNotifications}
          onDeleteHistory={handleDeleteHistory}
          onEditGroupInfo={handleEditGroupInfo}
          onAddMember={handleAddMember}
          onLeaveGroup={handleLeaveGroup}
          onLeaveSuccess={handleLeaveSuccess}
          onViewMembers={handleViewMembers}
          onChangeNickname={() => {
            // Nickname change is handled internally in ChatOptions
            // This prop is kept for future extensibility
          }}
          onNicknameChanged={() => {
            // Refresh conversation list to show updated nickname
            // Note: Conversation detail already refreshed by ChatOptions
            // UI updates automatically via store subscription
                      }}
        />
        
        <MessageActionMenu
          visible={isMessageActionMenuVisible}
          message={selectedActionMessage}
          onClose={closeMessageActions}
          onReply={handleReplyAction}
          onEdit={handleEditAction}
          onDelete={handleDeleteAction}
          onReact={handleReactAction}
          onReactMultiple={handleReactMultiple}
          onForward={handleForwardAction}
          onPin={handlePinAction}
          onUnpin={handleUnpinAction}
          isPinned={selectedActionMessage ? isMessagePinned(chatId, selectedActionMessage.id) : false}
          conversationType={currentChat?.isGroup ? 'group' : 'direct'}
          userRole={myGroupRole}
          canPinMessages={canPinMessages}
          onTranslate={handleTranslate}
        />

        <ForwardModal
          visible={isForwardModalVisible}
          message={selectedActionMessage}
          messages={selectedMessages.length > 1 ? selectedMessages : undefined}
          onClose={() => {
            setIsForwardModalVisible(false);
            // Exit multi-select mode when closing forward modal
            if (isMultiSelectMode) {
              exitMultiSelectMode();
            }
          }}
          onForward={handleForward}
          onBatchForward={handleBatchForwardMessages}
        />

        {/* Group Management Modals */}
        <GroupInfoModal
          visible={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          conversationId={chatId}
          currentName={title}
          currentAvatar={currentChat?.avatar || null}
          myRole={getMySettings(chatId)?.role || 'member'}
        />

        <MemberRoleModal
          visible={showMemberRoleModal}
          onClose={() => setShowMemberRoleModal(false)}
          conversationId={chatId}
          members={groupMembers}
          currentUserId={authUser?.id || ''}
          // isOwner and myRole props are deprecated - MemberRoleModal fetches fresh role from API
        />

        {showSummaryModal && (
          <SummaryModal
            visible={showSummaryModal}
            conversationId={chatId}
            onClose={() => setShowSummaryModal(false)}
          />
        )}

        {showEntityInfoModal && (
          <EntityInfoModal
            visible={showEntityInfoModal}
            entity={selectedEntityItem}
            onClose={() => setShowEntityInfoModal(false)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRightContainer: {
    flexDirection: 'row',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerOnlineDot: {
    marginTop: 2,
  },
  headerTextContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
  },
  headerPresenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  callButton: {
    marginLeft: 12,
  },
  // Search styles
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  closeSearchButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 13,
  },
  searchResultText: {
    fontSize: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  emptySearchContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
  },
  // Zalo-style search navigation
  searchCounter: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
    minWidth: 40,
    textAlign: 'center',
  },
  searchNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  searchNavButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  highlightedMessage: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)', // Yellow highlight like Zalo
    borderRadius: 8,
  },
  // Multi-select styles
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  multiSelectBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  multiSelectAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  multiSelectActionDisabled: {
    opacity: 0.5,
  },
  multiSelectActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  readOnlyComposer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  readOnlyComposerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { ChatOptions } from '@/src/components/chat/ChatOptions';
import { ForwardModal } from '@/src/components/chat/ForwardModal';
import { GroupInfoModal } from '@/src/components/chat/GroupInfoModal';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { MemberRoleModal } from '@/src/components/chat/MemberRoleModal';
import { MessageActionMenu } from '@/src/components/chat/MessageActionMenu';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { VideoViewer } from '@/src/components/chat/VideoViewer';
import { useAuth } from '@/src/contexts/AuthContext';
import { useChatDetailScreenLogic } from '@/src/hooks/screens/useChatDetailScreen';
import { getMessageReactions } from '@/src/services/chatService';
import * as mediaService from '@/src/services/mediaService';
import { lookupMessage } from '@/src/services/messagesApi';
import { searchUsers } from '@/src/services/usersApi';
import { useChatStore } from '@/src/store/chatStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useTheme } from '@/src/theme/themeContext';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronUp, Circle, List, Phone, Search, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { leaveConversation, addMember, markAsRead } from '@/src/services/conversationsApi';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { presence } = useChatStore();
  const { user: authUser } = useAuth();
  const setMessageReactions = useMessagesStore((state) => state.setMessageReactions);
  const deleteChat = useChatsStore((state) => state.deleteChat);

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
    isTypingVisible,
    closeMessageActions,
    handleReplyAction,
    handleEditAction,
    handleRevokeAction,
    handleDeleteAction,
    handleReactAction,
    handleUnreactAction,
    handleForwardAction,
    handleForward,
    selectedActionMessage,
    isMessageActionMenuVisible,
    isForwardModalVisible,
    setIsForwardModalVisible,
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

  // Group management state
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showMemberRoleModal, setShowMemberRoleModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Mark conversation as read when entering chat
  useEffect(() => {
    console.log('[ChatDetail] useEffect triggered, chatId:', chatId, 'type:', typeof chatId);
    if (chatId && chatId !== '') {
      console.log('[ChatDetail] Calling markAsRead for:', chatId);
      markAsRead(chatId)
        .then(() => {
          console.log('[ChatDetail] Mark as read SUCCESS');
          // Reset unread count in local store
          useChatsStore.getState().resetUnreadCount(chatId);
        })
        .catch((err) => console.error('[ChatDetail] Mark as read FAILED:', err?.message || err));
    } else {
      console.log('[ChatDetail] Skipping markAsRead - no valid chatId');
    }
  }, [chatId]);

  // Navigate to original conversation when clicking on forwarded message header
  const handleNavigateToForwarded = async (forwardedFrom: any) => {
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
  };

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
      
      if (visibility === 'public') {
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
      Alert.alert('Lỗi', 'Không thể tải tệp');
    }
  };

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

  const handleVoiceCall = () => {
    if (!currentChat) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin cuộc trò chuyện');
      return;
    }
    
    // For now, just show an alert - implement actual call functionality later
    const otherUserId = (currentChat as any)?.otherUserId || (currentChat as any)?.userId;
    const otherUserName = title;
    
    Alert.alert(
      'Cuộc gọi thoại',
      `Gọi cho ${otherUserName}?\n\nTính năng này sẽ được triển khai sau.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'OK', onPress: () => { /* TODO: Implement voice call */ } }
      ]
    );
  };

  const handleOpenSearch = () => {
    toggleSearchMode();
  };

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
    console.log('[ChatDetail] handleViewMembers - currentChat:', currentChat);
    console.log('[ChatDetail] handleViewMembers - members:', members);
    
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

  const handleLeaveGroup = () => {
    const isOwner = (currentChat as any)?.isOwner;
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
              await leaveConversation(chatId);
              router.back();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể rời nhóm');
            }
          }
        }
      ]
    );
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
    return (
      <MessageBubble
        item={item}
        isGroup={currentChat?.isGroup}
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
  ]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: {
            backgroundColor: theme.colors.statusBar,
          },
          headerTintColor: theme.colors.textHeader,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>{title}</Text>
              {presenceStatus === 'online' && (
                <View style={styles.headerOnlineDot}>
                  <Circle size={8} fill="#34c759" color="#34c759" />
                </View>
              )}
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              {!isSearchMode && (
                <>
                  <TouchableOpacity 
                    style={styles.callButton} 
                    onPress={handleVoiceCall}
                  >
                    <Phone size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callButton} onPress={handleOpenSearch}>
                    <Search size={20} color={theme.colors.iconHeader} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callButton} onPress={() => setShowChatOptions(true)}>
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
                Không tìm thấy tin nhắn nào cho "{searchQuery}"
              </Text>
            </View>
          ) : null}
        />

        <View>
          {isTypingVisible ? <TypingIndicator text={typingText} /> : null}
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
                    text: replyingMessage.isRevoked ? 'Tin nhan da thu hoi' : replyingMessage.text || '',
                  }
                : null
            }
            onCancelReply={() => setReplyingMessage(null)}
          />
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
          isOwner={(currentChat as any)?.isOwner ?? false}
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
        />
        
        <MessageActionMenu
          visible={isMessageActionMenuVisible}
          message={selectedActionMessage}
          onClose={closeMessageActions}
          onReply={handleReplyAction}
          onEdit={handleEditAction}
          onRevoke={handleRevokeAction}
          onDelete={handleDeleteAction}
          onReact={handleReactAction}
          onForward={handleForwardAction}
        />

        <ForwardModal
          visible={isForwardModalVisible}
          message={selectedActionMessage}
          onClose={() => setIsForwardModalVisible(false)}
          onForward={handleForward}
        />

        {/* Group Management Modals */}
        <GroupInfoModal
          visible={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          conversationId={chatId}
          currentName={title}
          currentAvatar={currentChat?.avatar || null}
          isOwner={(currentChat as any)?.isOwner ?? false}
        />

        <MemberRoleModal
          visible={showMemberRoleModal}
          onClose={() => setShowMemberRoleModal(false)}
          conversationId={chatId}
          members={groupMembers}
          currentUserId={authUser?.id || ''}
          isOwner={(currentChat as any)?.isOwner ?? false}
          myRole={(currentChat as any)?.myRole || 'member'}
        />
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
});

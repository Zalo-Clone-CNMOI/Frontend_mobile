import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { ChatOptions } from '@/src/components/chat/ChatOptions';
import { ForwardModal } from '@/src/components/chat/ForwardModal';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { MessageActionMenu } from '@/src/components/chat/MessageActionMenu';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { VideoViewer } from '@/src/components/chat/VideoViewer';
import { useAuth } from '@/src/contexts/AuthContext';
import { useChatDetailScreenLogic } from '@/src/hooks/screens/useChatDetailScreen';
import { useChatStore } from '@/src/store/chatStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useContactsStore } from '@/src/store/useContactsStore';
import { useTheme } from '@/src/theme/themeContext';
import { useUserProfiles } from '@/src/hooks/useUserProfiles';
import { addMembers } from '@/src/services/conversationsApi';
import * as mediaService from '@/src/services/mediaService';
import { getMessageReactions, reactMessage, unreactMessage } from '@/src/services/chatService';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { Circle, List, Phone, Users, X } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';

const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/';

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return S3_BASE_URL + avatar.replace(/^\//, '');
};

export default function GroupChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const setMessageReactions = useMessagesStore((state) => state.setMessageReactions);
  const { fetchUserProfile, getAvatarUrl } = useUserProfiles();
  const friends = useContactsStore((state) => state.friends);
  
  // Add members modal state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
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
    selectedVideo,
    setInput,
    setReplyingMessage,
    setSelectedImage,
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
  } = useChatDetailScreenLogic();

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
        const reactionsMap: Record<string, string[]> = {};
        reactions.summary.forEach((summary) => {
          reactionsMap[summary.type] = summary.userIds;
        });
        
        setMessageReactions(chatId, messageId, reactionsMap);
      }
    } catch (error) {
      // Error loading reactions
    }
  };

  const handleVoiceCall = () => {
    Alert.alert('Cuộc gọi nhóm', 'Tính năng gọi nhóm sẽ được triển khai sau');
  };

  const handleSearchMessages = () => {
    Alert.alert('Tìm kiếm tin nhắn', 'Tính năng tìm kiếm sẽ được triển khai sau');
  };

  const handleViewMembers = () => {
    Alert.alert('Thành viên', 'Danh sách thành viên sẽ được triển khai sau');
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

  // Get group members for header avatars
  const groupMembers = (currentChat as any)?.members || [];
  const displayAvatars = groupMembers.slice(0, 3); // Show max 3 avatars
  const currentMemberIds = groupMembers.map((m: any) => m.userId);

  // Filter friends to exclude current members
  const availableFriends = friends.filter((friend) => !currentMemberIds.includes(friend.id));
  const filteredFriends = availableFriends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMembers = async () => {
    if (selectedFriendIds.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một người bạn');
      return;
    }

    setAddingMembers(true);
    try {
      const response = await addMembers(chatId, selectedFriendIds);
      console.log('[Add Members] Response:', response);
      Alert.alert('Thành công', 'Đã thêm thành viên thành công');
      setShowAddMembersModal(false);
      setSelectedFriendIds([]);
      setSearchQuery('');
    } catch (error: any) {
      console.error('[Add Members] Error:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể thêm thành viên');
    } finally {
      setAddingMembers(false);
    }
  };

  // Fetch user profiles for message senders
  useEffect(() => {
    messages.forEach((message: any) => {
      if (message.senderId && !message.senderAvatar) {
        fetchUserProfile(message.senderId);
      }
    });
  }, [messages, fetchUserProfile]);

  const renderItem = React.useCallback(({ item }: { item: any }) => {
    const enhancedItem = {
      ...item,
      senderAvatar: getAvatarUrl(item.senderId),
    };

    return (
      <MessageBubble
        item={enhancedItem}
        isGroup={true}
        onLongPress={openMessageActions}
        onReuseRevoked={handleReuseRevokedMessage}
        onRevokeRestoreExpired={handleRevokedRestoreExpired}
        onPressReply={handleJumpToReplySource}
        onReactionPress={(messageId, reactionType) => {
          handleLoadReactions(messageId);
          handleUnreactAction(messageId, reactionType);
        }}
        onImagePress={setSelectedImage}
        onVideoPress={setSelectedVideo}
        onFilePress={handleFilePress}
      />
    );
  }, [
    openMessageActions, 
    handleReuseRevokedMessage, 
    handleRevokedRestoreExpired,
    handleJumpToReplySource, 
    handleUnreactAction,
    setSelectedImage, 
    setSelectedVideo,
    handleFilePress,
    handleLoadReactions,
    fetchUserProfile,
    getAvatarUrl
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
              <View style={styles.memberAvatars}>
                {displayAvatars.map((member: any) => {
                  const normalizedAvatar = member.avatarUrl ? normalizeAvatarUrl(member.avatarUrl) : null;
                  return (
                    <View key={member.userId} style={[styles.avatarWrapper, { borderColor: theme.colors.statusBar }]}>
                      {normalizedAvatar ? (
                        <Image source={{ uri: normalizedAvatar }} style={styles.smallAvatar} />
                      ) : (
                        <AvatarWithInitials name={member.fullName} size={24} style={styles.smallAvatar} />
                      )}
                    </View>
                  );
                })}
                {groupMembers.length > 3 && (
                  <View style={[styles.moreBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.moreBadgeText}>+{groupMembers.length - 3}</Text>
                  </View>
                )}
              </View>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <TouchableOpacity 
                style={styles.callButton} 
                onPress={handleVoiceCall}
              >
                <Phone size={20} color={theme.colors.iconHeader} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.callButton} onPress={() => setShowAddMembersModal(true)}>
                <Users size={20} color={theme.colors.iconHeader} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.callButton} onPress={() => setShowChatOptions(true)}>
                <List size={20} color={theme.colors.iconHeader} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 0}
      >
        <FlashList
          ref={flashListRef}
          data={messages}
          keyExtractor={(item, index) => String(item.id || `${item.conversationId || 'chat'}:${item.senderId || ''}:${item.timestamp || 0}:${item.text || ''}:${index}`)}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          onStartReached={handleLoadMore}
          onStartReachedThreshold={0.2}
          renderItem={renderItem}
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
                    senderName: replyingMessage.fromMe ? 'Bạn' : replyingMessage.senderName || title,
                    text: replyingMessage.isRevoked ? 'Tin nhắn đã thu hồi' : replyingMessage.text || '',
                  }
                : null
            }
            onCancelReply={() => setReplyingMessage(null)}
          />
        </View>

        <ImageViewer visible={!!selectedImage} uri={selectedImage} onClose={() => setSelectedImage(null)} />
        <VideoViewer visible={!!selectedVideo} uri={selectedVideo} onClose={() => setSelectedVideo(null)} />
        <ChatOptions
          visible={showChatOptions}
          onClose={() => setShowChatOptions(false)}
          chatId={chatId}
          chatName={title}
          chatAvatar={currentChat?.avatar || undefined}
          currentUserId={authUser?.id}
          otherUserId={undefined}
          onSearchMessages={handleSearchMessages}
          onViewProfile={() => {}}
          onChangeWallpaper={handleChangeWallpaper}
          onToggleNotifications={handleToggleNotifications}
          onDeleteHistory={handleDeleteHistory}
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

        <Modal
          visible={showAddMembersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddMembersModal(false)}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setShowAddMembersModal(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Thêm thành viên</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary, opacity: addingMembers ? 0.5 : 1 }]}
                  onPress={handleAddMembers}
                  disabled={addingMembers}
                >
                  <Text style={styles.addButtonText}>{addingMembers ? 'Đang thêm...' : 'Thêm'}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBox, { backgroundColor: theme.colors.card }]}>
                <TextInput
                  placeholder="Tìm kiếm bạn bè"
                  placeholderTextColor={theme.colors.text}
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlashList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.friendsList}
                renderItem={({ item }) => {
                  const selected = selectedFriendIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.friendRow, { borderBottomColor: theme.colors.border }]}
                      onPress={() => {
                        setSelectedFriendIds((prev) =>
                          prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                    >
                      <View style={styles.avatarWrapper}>
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        ) : (
                          <AvatarWithInitials name={item.name} size={44} style={styles.avatar} />
                        )}
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={[styles.fName, { color: theme.colors.text }]}>{item.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected ? theme.colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {selected && <X size={16} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.text }}>Không có bạn bè nào để thêm</Text>
                  </View>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: -8,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  moreBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  callButton: {
    marginLeft: 12,
  },
  // Add members modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  friendsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

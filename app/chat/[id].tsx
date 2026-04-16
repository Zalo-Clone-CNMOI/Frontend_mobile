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
import { useTheme } from '@/src/theme/themeContext';
import * as mediaService from '@/src/services/mediaService';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { Circle, List, Phone } from 'lucide-react-native';
import React from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

export default function ChatDetailScreen() {
  const theme = useTheme();
  const { presence } = useChatStore();
  const { user: authUser } = useAuth();
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
      } catch (error: any) {
        console.error('[handleFilePress] WebBrowser error:', error);
        
        // Fallback to Linking.openURL if WebBrowser fails
        try {
          await Linking.openURL(downloadUrl);
        } catch (e: any) {
          Alert.alert('Lỗi', 'Không thể mở file: ' + e.message);
        }
      }
    } catch (error: any) {
      console.error('[handleFilePress] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải file: ' + (error?.message || 'Unknown error'));
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
    return (
      <MessageBubble
        item={item}
        onLongPress={openMessageActions}
        onReuseRevoked={handleReuseRevokedMessage}
        onRevokeRestoreExpired={handleRevokedRestoreExpired}
        onPressReply={handleJumpToReplySource}
        onReactionPress={handleUnreactAction}
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
    setSelectedImage, 
    setSelectedVideo,
    handleFilePress
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
              <TouchableOpacity style={styles.callButton}>
                <Phone size={20} color={theme.colors.iconHeader} />
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
                    senderName: replyingMessage.fromMe ? 'Ban' : title,
                    text: replyingMessage.isRevoked ? 'Tin nhan da thu hoi' : replyingMessage.text || '',
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
});

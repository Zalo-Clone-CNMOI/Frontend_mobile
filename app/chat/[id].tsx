import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { ChatOptions } from '@/src/components/chat/ChatOptions';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { VideoViewer } from '@/src/components/chat/VideoViewer';
import { useChatDetailScreenLogic } from '@/src/hooks/screens/useChatDetailScreen';
import { useTheme } from '@/src/theme/themeContext';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { List, Phone } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatDetailScreen() {
  const theme = useTheme();
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
    handleReuseRevokedMessage,
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
    typingUsers,
  } = useChatDetailScreenLogic();

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
        behavior="padding"
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
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              onLongPress={openMessageActions}
              onReuseRevoked={handleReuseRevokedMessage}
              onImagePress={(uri) => setSelectedImage(uri)}
              onVideoPress={(uri: string) => setSelectedVideo(uri)}
            />
          )}
        />

        <View>
          {typingUsers.length > 0 ? <TypingIndicator /> : null}
          <ChatComposer
            value={input}
            onChangeText={setInput}
            onSend={onSend}
            onSendFiles={handleSendFiles}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
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
          chatAvatar={currentChat?.avatar}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerRightContainer: {
    flexDirection: 'row',
  },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 10 },
  callButton: {
    padding: 10,
  },
});


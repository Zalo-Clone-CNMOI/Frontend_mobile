import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { ChatOptions } from '@/src/components/chat/ChatOptions';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { VideoViewer } from '@/src/components/chat/VideoViewer';
import { loadInitialMessages, registerHandlers, sendMessage as sendSocketMessage } from '@/src/services/chatService';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useMessagesStore } from '@/src/store/useMessagesStore';
import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';

import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { List, Phone } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const chatId = params?.id || '';
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();

  // 'pan' mode on Android: screen pans up when keyboard opens.
  // Both platforms use 'padding' + headerHeight offset so composer
  // always sits exactly above the keyboard.
  const keyboardOffset = headerHeight;

  const title = useMemo(() => {
    if (typeof params?.name === 'string' && params.name.trim().length > 0) return params.name;
    return t('chat.default_title');
  }, [params?.name]);

  const [input, setInput] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const flashListRef = useRef<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);

  // Get messages from store
  const messagesByChatId = useMessagesStore((state) => state.messagesByChatId);
  const messages = messagesByChatId[chatId] || [];
  const initializeMessages = useMessagesStore((state) => state.initializeMessages);
  const addMessage = useMessagesStore((state) => state.addMessage);
  const updateMessage = useMessagesStore((state) => state.updateMessage);
  const deleteMessage = useMessagesStore((state) => state.deleteMessage);
  const revokeMessage = useMessagesStore((state) => state.revokeMessage);
  const theme = useTheme();
  const messageWidthMap = useRef<Record<string, number>>({});

  // Get chat info from store
  const chats = useChatsStore((state) => state.chats);
  const currentChat = useMemo(() => {
    return chats.find((chat) => chat.conversationId === chatId);
  }, [chats, chatId]);

  // Load initial messages and register WebSocket handlers
  useEffect(() => {
    console.log('🔌 Loading initial messages for chat:', chatId);
    loadInitialMessages(chatId);
  }, [chatId]);

  // Register WebSocket handlers for real-time updates
  useEffect(() => {
    console.log('🔌 Registering WebSocket handlers for chat:', chatId);
    
    const handlers = {
      onMessage: (msg: ChatMessage) => {
        console.log('📨 Received message via WebSocket:', msg);
        if (msg.conversationId === chatId) {
          addMessage(chatId, msg);
          // Auto scroll to new message
          setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      },
      onMessageUpdated: (msg: ChatMessage) => {
        console.log('📝 Message updated via WebSocket:', msg);
        if (msg.conversationId === chatId) {
          updateMessage(chatId, msg.id, msg);
        }
      },
      onMessageDeleted: (info: any) => {
        console.log('🗑️ Message deleted via WebSocket:', info);
        if (info.conversationId === chatId) {
          deleteMessage(chatId, info.messageId);
        }
      },
      onReactionAdded: (info: any) => {
        console.log('😊 Reaction added via WebSocket:', info);
        if (info.conversationId === chatId) {
          updateMessage(chatId, info.messageId, { reactions: info.reactions });
        }
      },
      onReactionRemoved: (info: any) => {
        console.log('😊 Reaction removed via WebSocket:', info);
        if (info.conversationId === chatId) {
          updateMessage(chatId, info.messageId, { reactions: info.reactions });
        }
      }
    };

    registerHandlers(handlers);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket handlers for chat:', chatId);
      registerHandlers({});
    };
  }, [chatId, addMessage, updateMessage, deleteMessage]);

  const handleSendFiles = async (files: any[]) => {
    const newMessages = files.map((file, index) => {
      const isImage = file.mimeType?.startsWith('image/');
      const isVideo = file.mimeType?.startsWith('video/');

      return {
        id: `${Date.now()}_${index}`,
        fromMe: true,
        senderId: 'user-me',
        text: '',
        timestamp: Date.now() + index,
        type: isImage ? ('image' as const) : isVideo ? ('video' as const) : ('file' as const),
        fileInfo: {
          name: file.name,
          size: file.size ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB',
          uri: file.uri,
          mimeType: file.mimeType,
        },
      } as any;
    });

    // Send each file via WebSocket
    for (const msg of newMessages) {
      try {
        const { optimisticMessage, sendPromise } = await sendSocketMessage(chatId, msg.text || msg.fileInfo?.name || 'File', [msg.fileInfo]);
        addMessage(chatId, optimisticMessage); // Optimistic UI update
        await sendPromise; // Real-time send
      } catch (error) {
        console.error('❌ Failed to send file message:', error);
      }
    }
    
    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const openMessageActions = (msg: ChatMessage) => {
    Alert.alert(t('chat.actions'), undefined, [
      {
        text: t('chat.reply_to'),
        onPress: () => {
          if (msg.isRevoked) return;
          setReplyingMessage(msg);
        },
      },
      {
        text: t('chat.revoke'),
        style: 'destructive',
        onPress: () => {
          revokeMessage(chatId, msg.id);
          if (replyingMessage?.id === msg.id) setReplyingMessage(null);
        },
      },
      { text: t('chat.cancel'), style: 'cancel' },
    ]);
  };

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      console.log('📤 Sending message via WebSocket:', trimmed);
      const { optimisticMessage, sendPromise } = await sendSocketMessage(chatId, trimmed);
      addMessage(chatId, optimisticMessage); // Optimistic UI update
      await sendPromise; // Real-time send
      setInput('');
      setReplyingMessage(null);
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => setShowChatOptions(true)}
              >
                <List size={20} color={theme.colors.iconHeader} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <FlashList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              onLongPress={openMessageActions}
              onImagePress={(uri) => {
                console.log('Opening image:', uri);
                setSelectedImage(uri);
              }}
              onVideoPress={(uri: string) => {
                console.log('Opening video:', uri);
                setSelectedVideo(uri);
              }}
            />
          )}
        />

        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={onSend}
          onSendFiles={handleSendFiles}
          replyingTo={
            replyingMessage
              ? {
                senderName: replyingMessage.fromMe ? 'Bạn' : title,
                text: replyingMessage.isRevoked ? 'Tin nhắn đã thu hồi' : (replyingMessage.text || ''),
              }
              : null
          }
          onCancelReply={() => setReplyingMessage(null)}
        />
        <ImageViewer
          visible={!!selectedImage}
          uri={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
        <VideoViewer
          visible={!!selectedVideo}
          uri={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
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
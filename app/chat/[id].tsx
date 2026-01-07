import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { ChatMessage } from '@/src/types/chat';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, List } from 'lucide-react-native';
import { ImageViewer } from '@/src/components/chat/ImageViewer';
import { useMessagesStore } from '@/src/store/useMessagesStore';

export default function ChatDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const chatId = params?.id || '';

  const title = useMemo(() => {
    if (typeof params?.name === 'string' && params.name.trim().length > 0) return params.name;
    return 'Trò chuyện';
  }, [params?.name]);

  const [input, setInput] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const flashListRef = useRef<FlashList<ChatMessage>>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get messages from store
  const messagesByChatId = useMessagesStore((state) => state.messagesByChatId);
  const messages = messagesByChatId[chatId] || [];
  const initializeMessages = useMessagesStore((state) => state.initializeMessages);
  const sendMessage = useMessagesStore((state) => state.sendMessage);
  const revokeMessage = useMessagesStore((state) => state.revokeMessage);

  useEffect(() => {
    initializeMessages();
  }, [initializeMessages]);

  const handleSendFiles = (files: DocumentPicker.DocumentPickerAsset[]) => {
    const newMessages = files.map((file, index) => {
      const isImage = file.mimeType?.startsWith('image/');

      return {
        id: `${Date.now()}_${index}`,
        fromMe: true,
        text: '',
        timestamp: new Date().toISOString(),
        type: isImage ? 'image' : 'file',
        fileInfo: {
          name: file.name,
          size: file.size ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB',
          uri: file.uri,
          mimeType: file.mimeType
        }
      };
    });

    newMessages.forEach(msg => sendMessage(chatId, msg));
    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const openMessageActions = (msg: ChatMessage) => {
    Alert.alert('Tùy chọn', undefined, [
      {
        text: 'Trả lời',
        onPress: () => {
          if (msg.isRevoked) return;
          setReplyingMessage(msg);
        },
      },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: () => {
          revokeMessage(chatId, msg.id);
          if (replyingMessage?.id === msg.id) setReplyingMessage(null);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    sendMessage(chatId, {
      text: trimmed,
      fromMe: true,
      time: '',
      replyTo: replyingMessage
        ? {
          id: replyingMessage.id,
          senderName: replyingMessage.fromMe ? 'Bạn' : title,
          text: replyingMessage.isRevoked ? 'Tin nhắn đã thu hồi' : replyingMessage.text,
        }
        : undefined,
    });
    setInput('');
    setReplyingMessage(null);
    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };


  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <TouchableOpacity style={styles.callButton}>
                <Phone size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.callButton}>
                <List size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlashList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={100}
          renderItem={({ item }) => <MessageBubble item={item} onLongPress={openMessageActions} onImagePress={(uri) =>{console.log("Opening image:", uri); setSelectedImage(uri);}} />}
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
                text: replyingMessage.isRevoked ? 'Tin nhắn đã thu hồi' : replyingMessage.text,
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerRightContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 10 },
  callButton: {
    padding: 10,
  },
});

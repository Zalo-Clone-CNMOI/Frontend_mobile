import { Bot, Sparkles } from 'lucide-react-native';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/theme/themeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { sendAIChatMessage } from '@/src/services/aiApi';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { ChatComposer } from '@/src/components/chat/ChatComposer';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack } from 'expo-router';

interface AIMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  isTyping?: boolean;
  entities?: {
    text: string;
    type: string;
    confidence: number;
  }[];
  suggestions?: string[];
  confidence?: number;
  needsClarification?: boolean;
  followUpQuestions?: string[];
}

export default function AIChatScreen() {
  const theme = useTheme();
  const { user: authUser } = useAuth();
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      text: t('ai_chat.welcome_message'),
      sender: 'ai',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Set typing indicator
    setIsTyping(true);

    try {
      // Integrate with AI API
      const response = await sendAIChatMessage({
        message: messageText,
        context: {
          previous_messages: messages
            .slice(-5)
            .map(msg => ({
              role: msg.sender === 'ai' ? 'assistant' : msg.sender,
              content: msg.text,
              timestamp: msg.timestamp,
            })),
          user_preferences: {
            userId: authUser?.id || 'unknown'
          }
        },
      });

      const aiResponse: AIMessage = {
        id: (Date.now() + 2).toString(),
        text: response.data.response,
        sender: 'ai',
        timestamp: Date.now(),
        entities: response.data.entities?.map(entity => ({
          text: entity.text,
          type: entity.type,
          confidence: entity.confidence,
        })),
        suggestions: response.data.suggestions,
        confidence: response.data.confidence,
        needsClarification: response.data.needs_clarification,
        followUpQuestions: response.data.follow_up_questions,
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch {
      Alert.alert(t('ai_chat.error_title'), t('ai_chat.error_message'));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Convert AI message to chat message format for MessageBubble
  const convertToChatMessage = (aiMessage: AIMessage) => {
    return {
      id: aiMessage.id,
      text: aiMessage.text,
      senderId: aiMessage.sender === 'user' ? authUser?.id || 'user' : 'ai-assistant',
      fromMe: aiMessage.sender === 'user',
      timestamp: aiMessage.timestamp,
      messageType: 'text' as any,
      type: 'text' as any,
      isRevoked: false,
      attachments: [],
      reactions: {} as any,
      replyTo: undefined,
      forwardedFrom: undefined,
      isEdited: false,
      isPinned: false,
      isRead: true,
      deliveryStatus: aiMessage.sender === 'user' ? 'sent' : undefined,
      // Add entities as metadata for AI messages
      metadata: aiMessage.entities ? {
        entities: aiMessage.entities,
        suggestions: aiMessage.suggestions,
        confidence: aiMessage.confidence,
        needsClarification: aiMessage.needsClarification,
        followUpQuestions: aiMessage.followUpQuestions,
      } as any : undefined,
    };
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    const chatMessage = convertToChatMessage(item);
    return (
      <MessageBubble
        item={chatMessage}
        conversationId="ai-chat"
        isGroup={false}
        onLongPress={() => {
          // Handle long press for AI messages if needed
          if (item.sender === 'ai') {
            Alert.alert(t('ai_chat.ai_message_alert'), item.text);
          }
        }}
      />
    );
  };

  const handleTypingStart = () => {
    // Could implement typing indicators to AI if needed
  };

  const handleTypingStop = () => {
    // Could implement typing indicators to AI if needed
  };

  const handleSendFiles = () => {
    Alert.alert(t('common.notice'), t('ai_chat.file_upload_notice'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.header,
            borderBottomWidth: 1,
          } as any,
          headerTintColor: theme.colors.textHeader,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <View style={[styles.aiIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Bot size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
                  {t('ai_chat.title')}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textHeader + 'CC' }]}>
                  {t('ai_chat.subtitle')}
                </Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.sparkleButton}>
              <Sparkles size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingContainer}>
                <View style={[styles.typingBubble, { backgroundColor: theme.colors.card }]}>
                  <TypingIndicator text={t('ai_chat.typing_text')} />
                </View>
              </View>
            ) : null
          }
        />

        {/* AI Suggestions */}
        {messages.length > 1 && messages[messages.length - 1]?.sender === 'ai' && 
         messages[messages.length - 1]?.suggestions && 
         messages[messages.length - 1]?.suggestions!.length > 0 && (
          <View style={[styles.suggestionsContainer, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.suggestionsTitle, { color: theme.colors.text }]}>
              {t('ai_chat.suggestions_title')}
            </Text>
            <View style={styles.suggestionChips}>
              {messages[messages.length - 1]?.suggestions?.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.primary + '30',
                    borderWidth: 1
                  }]}
                  onPress={() => setInputText(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat Composer */}
        <View style={[styles.composerContainer, { 
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border 
        }]}>
          <ChatComposer
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onSendFiles={handleSendFiles}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  sparkleButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  typingContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  typingBubble: {
    maxWidth: '70%',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  composerContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});

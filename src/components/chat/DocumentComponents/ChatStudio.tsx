import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { useTranslation } from 'react-i18next';
import { Send, Info, FileText } from 'lucide-react-native';
import { ResponseBubble } from './ResponseBubble';
import { documentService } from '@/src/services/ai/DocumentService';
import { useAIDocumentStore } from '@/src/store/useAIDocumentStore';
import type { DocumentMeta } from '@/src/store/useAIDocumentStore';

interface ChatStudioProps {
  selectedDocument: DocumentMeta | null;
}

interface Message {
  id: string;
  query: string;
  answer: string;
  sources: any[];
  timestamp: number;
  isLoading?: boolean;
}

export function ChatStudio({ selectedDocument }: ChatStudioProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleQuery = async () => {
    if (!query.trim() || !selectedDocument || isQuerying) return;

    const currentQuery = query.trim();
    const docId = selectedDocument.document_id;

    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        query: currentQuery,
        answer: '',
        sources: [],
        timestamp: Date.now(),
        isLoading: true,
      },
    ]);

    setQuery('');
    setIsQuerying(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    documentService.queryDocument(docId, currentQuery);

    const checkResult = setInterval(() => {
      // Access store fresh inside interval to get latest results
      const latestResults = useAIDocumentStore.getState().queryResults;
      const result = latestResults.get(docId);
      if (result && result.query === currentQuery) {
        setMessages(prev =>
          prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, answer: result.answer, sources: result.sources, isLoading: false }
              : msg
          )
        );
        setIsQuerying(false);
        clearInterval(checkResult);
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);

    setTimeout(() => {
      clearInterval(checkResult);
      setIsQuerying(false);
      setMessages(prev =>
        prev.map(msg =>
          msg.isLoading ? { ...msg, answer: 'Unable to get response. Please try again.', isLoading: false } : msg
        )
      );
    }, 30000);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Stateless Banner */}
      <View style={[styles.banner, { backgroundColor: theme.colors.primary + '10' }]}>
        <Info size={14} color={theme.colors.primary} />
        <Text style={[styles.bannerText, { color: theme.colors.primary }]}>
          Stateless Mode: Each question is processed independently
        </Text>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {!selectedDocument ? (
          <View style={styles.noDocState}>
            <FileText size={48} color={theme.colors.icon} />
            <Text style={[styles.noDocTitle, { color: theme.colors.text }]}>
              Select a document
            </Text>
            <Text style={[styles.noDocSubtitle, { color: theme.colors.icon }]}>
              Choose a document from the left panel to start asking questions
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.noDocState}>
            <Text style={[styles.askTitle, { color: theme.colors.text }]}>
              Ask about "{selectedDocument.file_name}"
            </Text>
            <Text style={[styles.noDocSubtitle, { color: theme.colors.icon }]}>
              Type your question below to get answers based on the document
            </Text>
          </View>
        ) : (
          messages.map(msg => (
            <ResponseBubble
              key={msg.id}
              query={msg.query}
              answer={msg.answer}
              sources={msg.sources}
              timestamp={msg.timestamp}
            />
          ))
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Ask a question about this document..."
          placeholderTextColor={theme.colors.icon}
          value={query}
          onChangeText={setQuery}
          multiline
          maxLength={500}
          editable={selectedDocument?.status === 'completed' && !isQuerying}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                query.trim() && selectedDocument?.status === 'completed' && !isQuerying
                  ? theme.colors.primary
                  : theme.colors.primary + '40',
            },
          ]}
          onPress={handleQuery}
          disabled={!query.trim() || selectedDocument?.status !== 'completed' || isQuerying}
        >
          {isQuerying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    minHeight: '100%',
  },
  noDocState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  noDocTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  askTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  noDocSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
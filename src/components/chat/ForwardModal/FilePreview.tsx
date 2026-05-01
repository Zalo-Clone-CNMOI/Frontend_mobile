import { File, Send } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ChatMessage } from '@/src/types/chat';
import { styles } from './styles';

interface FilePreviewProps {
  message?: ChatMessage | null;
  messages?: ChatMessage[];
  optionalMessage: string;
  onOptionalMessageChange: (text: string) => void;
  selectedCount: number;
  onSend: () => void;
}

const formatFileSize = (bytes: number | string): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (Number.isNaN(numBytes) || numBytes === 0) return '0 B';
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(0)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FilePreview: React.FC<FilePreviewProps> = ({
  message,
  messages,
  optionalMessage,
  onOptionalMessageChange,
  selectedCount,
  onSend,
}) => {
  const messageCount = messages?.length || (message ? 1 : 0);
  const { t } = useTranslation();

  const isSendDisabled = selectedCount === 0;

  return (
    <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
      {/* File Preview Box */}
      {messageCount > 0 && (
        <View style={styles.filePreviewBox}>
          <View style={styles.fileIconContainer}>
            <File size={24} color="#0068FF" />
          </View>
          <View style={styles.fileInfoContainer}>
            <Text style={styles.fileName} numberOfLines={1}>
              {messageCount > 1 
                ? `${messageCount} ${t('forward.messages', { defaultValue: 'tin nhắn' })}`
                : (message?.fileInfo?.name || t('forward.message'))}
            </Text>
            <Text style={styles.fileSize}>
              {messageCount > 1 
                ? t('forward.multiple_messages', { defaultValue: 'Nhiều tin nhắn được chọn' })
                : (message?.fileInfo?.size ? formatFileSize(message.fileInfo.size) : '20 KB')}
            </Text>
          </View>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.messageInput}
          placeholder={t('forward.messagePlaceholder')}
          placeholderTextColor="#8e8e93"
          value={optionalMessage}
          onChangeText={onOptionalMessageChange}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={isSendDisabled}
          style={[
            styles.sendButtonCircle,
            !isSendDisabled && styles.sendButtonCircleActive,
          ]}
        >
          <Send
            size={20}
            color={isSendDisabled ? '#9CA3AF' : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

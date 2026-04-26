import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

interface ReplyBarProps {
  type: 'reply' | 'edit';
  senderName?: string;
  text: string;
  onCancel: () => void;
  theme: any;
}

export const ReplyBar: React.FC<ReplyBarProps> = ({
  type,
  senderName,
  text,
  onCancel,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.replyingWrap,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.replyingBar,
          { backgroundColor: theme.colors.primary },
        ]}
      />
      <View style={styles.replyingContent}>
        <Text
          style={[
            styles.replyingTitle,
            { color: theme.colors.primary },
          ]}
          numberOfLines={1}
        >
          {type === 'edit' ? t('common.edit') : `${t('messages.replying_to')} ${senderName}`}
        </Text>
        <Text
          style={[
            styles.replyingText,
            { color: theme.colors.text, opacity: 0.7 },
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
      <Pressable style={styles.replyingClose} onPress={onCancel}>
        <X size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
};

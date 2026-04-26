import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import type { ForwardedFrom } from '@/src/types/chat';

interface ForwardedHeaderProps {
  forwardedFrom: ForwardedFrom;
  isMe: boolean;
  onPress: () => void;
}

export const ForwardedHeader: React.FC<ForwardedHeaderProps> = ({
  forwardedFrom,
  isMe,
  onPress,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.forwardedHeader,
        {
          backgroundColor: isMe
            ? 'rgba(255,255,255,0.15)'
            : theme.colors.primary + '15',
          borderWidth: 1,
          borderColor: theme.colors.primary + '40',
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 6,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.forwardedHeaderContent}>
        <View
          style={[
            styles.forwardedAvatarContainer,
            {
              backgroundColor: theme.colors.primary + '25',
              width: 24,
              height: 24,
              borderRadius: 12,
              marginRight: 10,
            },
          ]}
        >
          <Text
            style={[
              styles.forwardedAvatarText,
              {
                color: theme.colors.primary,
                fontSize: 12,
                fontWeight: '600',
              },
            ]}
          >
            {(forwardedFrom.sourceSenderNameSnapshot || forwardedFrom.source_sender_name_snapshot)?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.forwardedContent}>
          <Text
            style={[
              styles.forwardedHeaderText,
              {
                color: theme.colors.text,
                fontSize: 13,
                fontWeight: '500',
                lineHeight: 16,
              },
            ]}
            numberOfLines={1}
          >
            {t('chat.forwarded_from', { defaultValue: 'Đã chuyển tiếp' })}{' '}
            {forwardedFrom.sourceSenderNameSnapshot || forwardedFrom.source_sender_name_snapshot || 'Unknown'}
          </Text>
          <Text
            style={[
              styles.forwardedSubText,
              {
                color: theme.colors.text,
                fontSize: 11,
                opacity: 0.6,
                marginTop: 1,
              },
            ]}
            numberOfLines={1}
          >
            {t('messages.view_original_message', { defaultValue: 'Xem tin nhắn gốc' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  forwardedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'stretch',
    marginHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  forwardedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forwardedAvatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardedAvatarText: {
    fontWeight: '600',
  },
  forwardedContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 4,
  },
  forwardedHeaderText: {
    fontWeight: '500',
  },
  forwardedSubText: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
});

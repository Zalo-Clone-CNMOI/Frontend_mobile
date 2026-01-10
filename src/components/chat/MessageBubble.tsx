import type { ChatMessage } from '@/src/types/chat';
import { FileText } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { useTranslation } from 'react-i18next';

export function MessageBubble({
  item,
  onLongPress,
  onImagePress,
}: {
  item: ChatMessage;
  onLongPress?: (item: ChatMessage) => void;
  onImagePress?: (uri: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const formatTime = (dateProp: any) => {
    const d = dateProp ? new Date(dateProp) : new Date();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const isImage =
    item.type === 'image' ||
    item.fileInfo?.mimeType?.startsWith('image/');
  const isFile = (item.type === 'file' || !!item.fileInfo) && !isImage;

  const isMe = item.fromMe;

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.rowRight : styles.rowLeft,
      ]}
    >
      <View
        style={[
          styles.bubbleWrapper,
          { alignItems: isMe ? 'flex-end' : 'flex-start' },
        ]}
      >
        <TouchableOpacity
          onLongPress={() => onLongPress?.(item)}
          style={[
            styles.bubble,
            {
              backgroundColor: isMe
                ? theme.colors.primary
                : theme.colors.card,
              borderColor: isMe
                ? theme.colors.primary
                : theme.colors.border,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
            },
            isImage && styles.imageBubble,
            item.replyTo && styles.bubbleWithReply,
            isFile && { minWidth: 220 },
          ]}
        >
          {/* ===== Reply Preview ===== */}
          {item.replyTo && (
            <View
              style={[
                styles.replyWrap,
                {
                  backgroundColor: isMe
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <View
                style={[
                  styles.replyBar,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <View style={styles.replyContent}>
                <Text
                  style={[
                    styles.replyName,
                    { color: theme.colors.primary },
                  ]}
                  numberOfLines={1}
                >
                  {item.replyTo.senderName}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    { color: theme.colors.text, opacity: 0.7 },
                  ]}
                  numberOfLines={1}
                >
                  {item.replyTo.text}
                </Text>
              </View>
            </View>
          )}

          {/* ===== Message Content ===== */}
          <View>
            {item.isRevoked ? (
              <Text
                style={[
                  styles.revoked,
                  { color: theme.colors.text, opacity: 0.6 },
                ]}
              >
                {t('messages.revoked')}
              </Text>
            ) : isImage ? (
              <Pressable
                onPress={() =>
                  onImagePress?.(item.fileInfo?.uri || '')
                }
              >
                <Image
                  source={{ uri: item.fileInfo?.uri }}
                  style={styles.sentImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : isFile ? (
              <View style={styles.fileContainer}>
                <View
                  style={[
                    styles.fileIconBox,
                    {
                      backgroundColor: isMe
                        ? 'rgba(255,255,255,0.25)'
                        : `${theme.colors.primary}22`,
                    },
                  ]}
                >
                  <FileText
                    size={22}
                    color={
                      isMe
                        ? theme.colors.icon
                        : theme.colors.primary
                    }
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text
                    style={[
                      styles.fileName,
                      {
                        color: isMe
                          ? theme.colors.icon
                          : theme.colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.fileInfo?.name || 'Tài liệu'}
                  </Text>
                  <Text
                    style={[
                      styles.fileSize,
                      { color: theme.colors.text, opacity: 0.6 },
                    ]}
                  >
                    {item.fileInfo?.size || 'N/A'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                style={[
                  styles.text,
                  {
                    color: isMe
                      ? theme.colors.icon
                      : theme.colors.text,
                  },
                ]}
              >
                {item.text}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {!item.isRevoked && (
          <Text
            style={[
              styles.timestamp,
              { color: theme.colors.text, opacity: 0.5 },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  bubbleWrapper: {
    maxWidth: '82%',
  },

  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 0.5,
  },

  /* ===== Image ===== */
  imageBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  sentImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },

  /* ===== File ===== */
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileSize: { fontSize: 11, marginTop: 2 },

  /* ===== Text ===== */
  text: {
    fontSize: 15,
    lineHeight: 20,
  },

  revoked: {
    fontSize: 14,
    fontStyle: 'italic',
  },

  timestamp: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },

  /* ===== Reply ===== */
  replyWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  replyBar: {
    width: 3,
  },
  replyContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 12,
    marginTop: 1,
  },

  bubbleWithReply: {
    paddingTop: 6,
  },
});

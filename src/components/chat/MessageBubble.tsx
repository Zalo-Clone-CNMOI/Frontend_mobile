import React from 'react';
import { Pressable, Text, StyleSheet, View, Image } from 'react-native';
import type { ChatMessage } from '@/src/types/chat';
import { FileText } from 'lucide-react-native';

export function MessageBubble({
  item,
  onLongPress,
  onImagePress
}: {
  item: ChatMessage;
  onLongPress?: (item: ChatMessage) => void;
  onImagePress?: (uri: string) => void;
}) {
  const formatTime = (dateProp: any) => {
    const d = dateProp ? new Date(dateProp) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Xác định loại nội dung: Image, File, hay Text
  const isImage = item.type === 'image' || item.fileInfo?.mimeType?.startsWith('image/');
  const isFile = (item.type === 'file' || !!item.fileInfo) && !isImage;

  return (
    <View style={[styles.container, item.fromMe ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubbleWrapper, item.fromMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>

        <Pressable
          onLongPress={() => onLongPress?.(item)}
          style={[
            styles.bubble,
            item.fromMe ? styles.bubbleMe : styles.bubbleOther,
            isImage && styles.imageBubble, // Ảnh không cần padding
            item.replyTo ? styles.bubbleWithReply : null,
            isFile && { minWidth: 220 }
          ]}
        >
          {/* Reply Section */}
          {item.replyTo && (
            <View style={styles.replyWrap}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyName} numberOfLines={1}>{item.replyTo.senderName}</Text>
                <Text style={styles.replyText} numberOfLines={1}>{item.replyTo.text}</Text>
              </View>
            </View>
          )}

          <View style={styles.messageContent}>
            {item.isRevoked ? (
              <Text style={styles.revoked}>Tin nhắn đã thu hồi</Text>
            ) : isImage ? (
              <Pressable onPress={() => onImagePress?.(item.fileInfo?.uri || '')}>
                <Image
                  source={{ uri: item.fileInfo?.uri }}
                  style={styles.sentImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : isFile ? (
              /* --- HIỂN THỊ FILE/TÀI LIỆU --- */
              <View style={styles.fileContainer}>
                <View style={styles.fileIconBox}>
                  <FileText size={24} color={item.fromMe ? "#fff" : "#0091ff"} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{item.fileInfo?.name || 'Tài liệu'}</Text>
                  <Text style={styles.fileSize}>{item.fileInfo?.size || 'N/A'}</Text>
                </View>
              </View>
            ) : (
              /* --- HIỂN THỊ VĂN BẢN --- */
              <Text style={styles.text}>{item.text}</Text>
            )}
          </View>
        </Pressable>

        {!item.isRevoked && (
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4, flexDirection: 'row', paddingHorizontal: 12 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubbleWrapper: { maxWidth: '82%' },
  bubble: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, borderWidth: 0.5 },
  bubbleOther: { backgroundColor: '#262626', borderColor: '#333', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#0055ff', borderColor: '#0055ff', borderBottomRightRadius: 4 },

  // Style cho Ảnh
  imageBubble: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', borderWidth: 0 },
  sentImage: { width: 220, height: 220, borderRadius: 14 },

  // Style cho File
  fileContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  fileSize: { color: '#ccc', fontSize: 11, marginTop: 2 },

  text: { fontSize: 15, lineHeight: 20, color: '#fff' },
  revoked: { fontSize: 14, color: '#8e8e93', fontStyle: 'italic' },
  timestamp: { fontSize: 10, color: '#8e8e93', marginTop: 4, marginHorizontal: 4 },
  replyWrap: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' },
  replyBar: { width: 3, backgroundColor: '#0091ff' },
  replyContent: { paddingHorizontal: 8, paddingVertical: 4, flex: 1 },
  replyName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  replyText: { color: '#ccc', fontSize: 12, marginTop: 1 },
});
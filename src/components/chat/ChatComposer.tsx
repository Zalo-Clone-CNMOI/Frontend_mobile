import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { File, FileText, Image as ImageIcon, MapPin, Mic, MoreHorizontal, Send, Smile, User, X } from 'lucide-react-native';
// Thay thế emoji-picker-react bằng thư viện cho React Native
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import * as DocumentPicker from 'expo-document-picker';


const ZALO_BLUE = '#0091ff';

// Định nghĩa lại Props để nhận mảng assets từ DocumentPicker
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onSendFiles, // Hàm này nhận vào một mảng File
  replyingTo,
  onCancelReply,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  onSendFiles: (files: DocumentPicker.DocumentPickerAsset[]) => void;
  replyingTo?: {
    senderName: string;
    text: string;
  } | null;
  onCancelReply?: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const canSend = useMemo(() => value.trim().length > 0, [value]);

  const handlePickEmoji = (emojiObject: EmojiType) => {
    onChangeText((prevValue: string) => {
      return prevValue + emojiObject.emoji;
    });
  };

  // --- PHẦN ĐÃ SỬA ---
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true, // Cho phép chọn nhiều file
      });

      if (!result.canceled && result.assets) {
        onSendFiles(result.assets);

        setShowMore(false); // Đóng bảng chọn
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  return (
    <View style={styles.container}>
      {/* Phần Reply tin nhắn */}
      {!!replyingTo && (
        <View style={styles.replyingWrap}>
          <View style={styles.replyingBar} />
          <View style={styles.replyingContent}>
            <Text style={styles.replyingTitle} numberOfLines={1}>
              Trả lời {replyingTo.senderName}
            </Text>
            <Text style={styles.replyingText} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <Pressable style={styles.replyingClose} onPress={onCancelReply}>
            <X size={18} color="#8e8e93" />
          </Pressable>
        </View>
      )}

      <View style={styles.composer}>
        <Pressable
          style={[styles.iconBtn, showEmoji && { backgroundColor: ZALO_BLUE }]}
          onPress={() => {
            setShowEmoji(true);
            setShowMore(false);
          }}
        >
          <Smile size={20} color="#fff" />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Tin nhắn"
          placeholderTextColor="#8e8e93"
          style={styles.input}
          multiline
          onFocus={() => {
            setShowEmoji(false);
            setShowMore(false);
          }}
        />

        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            setShowMore((v) => !v);
            setShowEmoji(false);
          }}
        >
          <MoreHorizontal size={20} color="#fff" />
        </Pressable>

        {canSend ? (
          <Pressable style={styles.sendBtn} onPress={onSend}>
            <Send size={18} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.rightIcons}>
            <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Tính năng', 'Gửi Audio')}>
              <Mic size={20} color="#fff" />
            </Pressable>
            {/* Nút gửi ảnh nhanh (có thể gọi hàm chọn file luôn hoặc logic chọn ảnh riêng) */}
            <Pressable style={styles.iconBtn} onPress={handlePickDocument}>
              <ImageIcon size={20} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Board chức năng thêm */}
      {showMore && (
        <View style={styles.moreBoard}>
          <Option title="File" Icon={File} onPress={handlePickDocument} />
          <Option title="Vị trí" Icon={MapPin} onPress={() => Alert.alert('Tính năng', 'Chia sẻ vị trí')} />
          <Option title="Liên hệ" Icon={User} onPress={() => Alert.alert('Tính năng', 'Chia sẻ liên hệ')} />
          <Option title="Tài liệu" Icon={FileText} onPress={handlePickDocument} />
        </View>
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handlePickEmoji}
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        theme={{
          backdrop: '#1a1a1ab3',
          knob: ZALO_BLUE,
          container: '#1a1a1a',
          header: '#fff',
          skinTonesContainer: '#222',
          category: {
            icon: ZALO_BLUE,
            iconActive: '#fff',
            container: '#222',
            containerActive: ZALO_BLUE,
          },
        }}
      />
    </View>
  );
}

function Option({ title, Icon, onPress }: { title: string; Icon: any; onPress: () => void }) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <View style={styles.optionIcon}>
        <Icon size={20} color={ZALO_BLUE} />
      </View>
      <Text style={styles.optionText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a1a', borderTopWidth: 0.5, borderTopColor: '#222' },
  replyingWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 14,
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  replyingBar: { width: 3, height: '100%', backgroundColor: ZALO_BLUE },
  replyingContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  replyingTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  replyingText: { color: '#bdbdbd', fontSize: 12.5, marginTop: 2 },
  replyingClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  composer: {
    padding: 10,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
  },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ZALO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  moreBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 20,
    gap: 10,
  },
  option: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#0e2236',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
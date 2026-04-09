import { useTheme } from '@/src/theme/themeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  File,
  FileText,
  Film,
  Image as ImageIcon,
  MapPin,
  Mic,
  MoreHorizontal,
  Send,
  Smile,
  User,
  X,
} from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { EmojiKeyboard, EmojiType } from 'rn-emoji-keyboard';


export type ChatComposerProps = {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  onSendFiles: (files: DocumentPicker.DocumentPickerAsset[]) => void;
  editingTo?: {
    text: string;
  } | null;
  onCancelEdit?: () => void;
  replyingTo?: {
    senderName: string;
    text: string;
  } | null;
  onCancelReply?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
};

export const ChatComposer = React.memo(function ChatComposer({
  value,
  onChangeText,
  onSend,
  onSendFiles,
  editingTo,
  onCancelEdit,
  replyingTo,
  onCancelReply,
  onTypingStart,
  onTypingStop,
}: ChatComposerProps) {
  const theme = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const { t } = useTranslation();



  const canSend = useMemo(() => value.trim().length > 0, [value]);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (onTypingStart) onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  const handlePickEmoji = (emoji: EmojiType) => {
    handleTextChange(value + emoji.emoji);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        onSendFiles(result.assets);
        setShowMore(false);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos' as ImagePicker.MediaType],
        quality: 1,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const videoAssets: DocumentPicker.DocumentPickerAsset[] = result.assets.map(
          (asset: ImagePicker.ImagePickerAsset) => ({
            uri: asset.uri,
            name: asset.fileName || `video_${Date.now()}.mp4`,
            mimeType: asset.mimeType || 'video/mp4',
            size: asset.fileSize || 0,
            lastModified: Date.now(),
          })
        );

        onSendFiles(videoAssets);
        setShowMore(false);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện video. Vui lòng thử lại.');
      console.error('Video picker error:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        quality: 0.8,
        selectionLimit: 5, // Allow up to 5 images
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Convert ImagePicker assets to DocumentPicker format for compatibility
        const imageAssets: DocumentPicker.DocumentPickerAsset[] = result.assets.map((asset: ImagePicker.ImagePickerAsset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          lastModified: Date.now(),
        }));
        
        onSendFiles(imageAssets);
        setShowMore(false);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh. Vui lòng thử lại.');
      console.error('Gallery error:', error);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {/* ===== Reply ===== */}
      {!!editingTo && (
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
              {t('common.edit')}
            </Text>
            <Text
              style={[
                styles.replyingText,
                { color: theme.colors.text, opacity: 0.7 },
              ]}
              numberOfLines={1}
            >
              {editingTo.text}
            </Text>
          </View>
          <Pressable style={styles.replyingClose} onPress={onCancelEdit}>
            <X size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      )}

      {!!replyingTo && !editingTo && (
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
              {t('messages.replying_to')} {replyingTo.senderName}
            </Text>
            <Text
              style={[
                styles.replyingText,
                { color: theme.colors.text, opacity: 0.7 },
              ]}
              numberOfLines={1}
            >
              {replyingTo.text}
            </Text>
          </View>
          <Pressable style={styles.replyingClose} onPress={onCancelReply}>
            <X size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      )}

      {/* ===== Composer ===== */}
      <View style={styles.composer}>
        <Pressable
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setShowEmoji(true);
            setShowMore(false);
          }}
        >
          <Smile size={20} color={theme.colors.icon} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={t('chat.placeholder')}
          placeholderTextColor="#8e8e93"
          multiline
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          onFocus={() => {
            setShowEmoji(false);
            setShowMore(false);
          }}
        />

        <Pressable
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.card },
          ]}
          onPress={() => {
            if (!showMore) Keyboard.dismiss();
            setShowMore((v) => !v);
            setShowEmoji(false);
          }}
        >
          <MoreHorizontal size={20} color={theme.colors.icon} />
        </Pressable>

        {canSend ? (
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (onTypingStop) onTypingStop();
              onSend();
            }}
          >
            <Send size={18} color={theme.colors.icon} />
          </Pressable>
        ) : (
          <View style={styles.rightIcons}>
            <Pressable
              style={[
                styles.iconBtn,
                { backgroundColor: theme.colors.card },
              ]}
            >
              <Mic size={20} color={theme.colors.icon} />
            </Pressable>
            <Pressable
              style={[
                styles.iconBtn,
                { backgroundColor: theme.colors.card },
              ]}
              onPress={handlePickImage}
            >
              <ImageIcon size={20} color={theme.colors.icon} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ===== More Board ===== */}
      {showMore && (
        <View style={styles.moreBoard}>
          <Option title={t('chat.file')} Icon={File} onPress={handlePickDocument} theme={theme} />
          <Option title="Hình ảnh" Icon={ImageIcon} onPress={handlePickImage} theme={theme} />
          <Option title="Video" Icon={Film} onPress={handlePickVideo} theme={theme} />
          <Option title={t('chat.location')} Icon={MapPin} onPress={() => {}} theme={theme} />
          <Option title={t('chat.contact')} Icon={User} onPress={() => {}} theme={theme} />
          <Option title={t('chat.document')} Icon={FileText} onPress={handlePickDocument} theme={theme} />
        </View>
      )}

      {/* ===== Emoji ===== */}
      {showEmoji && (
        <View style={{ height: 300 }}>
          <EmojiKeyboard
            onEmojiSelected={handlePickEmoji}
            theme={{
              container: theme.colors.card,
              header: theme.colors.text,
            }}
            styles={{
              container: { borderRadius: 0 },
            }}
          />
        </View>
      )}
    </View>
  );
});

/* ===== Option ===== */
function Option({
  title,
  Icon,
  onPress,
  theme,
}: {
  title: string;
  Icon: any;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Icon size={20} color={theme.colors.iconHeader} />
      </View>
      <Text style={[styles.optionText, { color: theme.colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
  },

  replyingWrap: {
    margin: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  replyingBar: { width: 3, height: '100%' },
  replyingContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  replyingTitle: { fontSize: 13, fontWeight: '600' },
  replyingText: { fontSize: 12.5, marginTop: 2 },
  replyingClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    marginHorizontal: 6,
    borderWidth: 1,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightIcons: { flexDirection: 'row' },

  moreBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
    height: 300, // mimics keyboard height
  },

  option: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },

  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});

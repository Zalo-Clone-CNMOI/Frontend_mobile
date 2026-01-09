import {
  File,
  FileText,
  Image as ImageIcon,
  MapPin,
  Mic,
  MoreHorizontal,
  Send,
  Smile,
  User,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { useTheme } from '@/src/theme/themeContext';
import { useTranslation } from 'react-i18next';


export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onSendFiles,
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
  const theme = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { t } = useTranslation();

  const canSend = useMemo(() => value.trim().length > 0, [value]);

  const handlePickEmoji = (emoji: EmojiType) => {
    onChangeText(value + emoji.emoji);
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
      {!!replyingTo && (
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
              Trả lời {replyingTo.senderName}
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
            setShowEmoji(true);
            setShowMore(false);
          }}
        >
          <Smile size={20} color={theme.colors.icon} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
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
            onPress={onSend}
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
              onPress={handlePickDocument}
            >
              <ImageIcon size={20} color={theme.colors.icon} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ===== More Board ===== */}
      {showMore && (
        <View style={styles.moreBoard}>
          <Option title="File" Icon={File} onPress={handlePickDocument} theme={theme} />
          <Option title="Vị trí" Icon={MapPin} onPress={() => {}} theme={theme} />
          <Option title="Liên hệ" Icon={User} onPress={() => {}} theme={theme} />
          <Option title="Tài liệu" Icon={FileText} onPress={handlePickDocument} theme={theme} />
        </View>
      )}

      {/* ===== Emoji ===== */}
      <EmojiPicker
        open={showEmoji}
        onEmojiSelected={handlePickEmoji}
        onClose={() => setShowEmoji(false)}
        theme={{
          backdrop: '#00000066',
          knob: theme.colors.primary,
          container: theme.colors.card,
          header: theme.colors.text,
        }}
      />
    </View>
  );
}

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
    <Pressable
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
          { backgroundColor: `${theme.colors.primary}22` },
        ]}
      >
        <Icon size={20} color={theme.colors.primary} />
      </View>
      <Text style={[styles.optionText, { color: theme.colors.text }]}>
        {title}
      </Text>
    </Pressable>
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

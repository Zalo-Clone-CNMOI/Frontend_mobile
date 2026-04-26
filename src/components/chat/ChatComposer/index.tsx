import { useTheme } from '@/src/theme/themeContext';
import * as DocumentPicker from 'expo-document-picker';
import { ImageIcon, Mic, MoreHorizontal, SendHorizontal, Smile } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ReplyBar } from './components/ReplyBar';
import { ImagePreview } from './components/ImagePreview';
import { MoreOptions } from './components/MoreOptions';
import { useFilePicker } from './hooks/useFilePicker';
import { styles } from './styles';

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
  const [showMore, setShowMore] = useState(false);
  const [selectedImages, setSelectedImages] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const typingTimeoutRef = useRef<any>(null);

  const { handlePickDocument, handlePickVideo, handlePickImage } = useFilePicker();

  const canSend = useMemo(() => value.trim().length > 0 || selectedImages.length > 0, [value, selectedImages]);

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

  const handlePickImageForPreview = () => {
    handlePickImage(
      (newImages) => setSelectedImages(prev => [...prev, ...newImages]),
      () => setShowMore(false)
    );
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendImages = () => {
    if (selectedImages.length > 0) {
      onSendFiles(selectedImages);
      setSelectedImages([]);
    }
  };

  const handleSend = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTypingStop) onTypingStop();
    if (selectedImages.length > 0) {
      handleSendImages();
    } else {
      onSend();
    }
  };

  const handleMorePress = () => {
    if (!showMore) Keyboard.dismiss();
    setShowMore(v => !v);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
    
    {/* Phần Reply hoặc Image Preview (nếu có) */}
    <View style={styles.topSection}>
      {!!editingTo && <ReplyBar type="edit" text={editingTo.text} onCancel={onCancelEdit || (() => {})} theme={theme} />}
      {selectedImages.length > 0 && <ImagePreview images={selectedImages} onRemove={handleRemoveImage} onAddMore={handlePickImageForPreview} theme={theme} />}
      {!!replyingTo && !editingTo && <ReplyBar type="reply" senderName={replyingTo.senderName} text={replyingTo.text} onCancel={onCancelReply || (() => {})} theme={theme} />}
    </View>

    <View style={styles.composer}>
      {/* 1. Nút Emoji trái */}
      <Pressable style={styles.iconBtn}>
        <Smile size={26} color={theme.colors.icon} strokeWidth={1.5} />
      </Pressable>

      {/* 2. Ô nhập liệu */}
      <View style={styles.inputContainer}>
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder="Nhập tin nhắn"
          placeholderTextColor="#999"
          style={styles.input}
          multiline
        />
      </View>

      

      {/* 3. Cụm icon bên phải */}
      <View style={styles.rightIcons}>
        {/* Nếu có chữ hoặc ảnh thì hiện nút Gửi, không thì hiện Image/Mic */}
        {canSend ? (
          <Pressable style={styles.iconBtn} onPress={handleSend}>
            <SendHorizontal size={26} color={theme.colors.primary} />
          </Pressable>
        ) : (
          <>
          <Pressable style={styles.iconBtn} onPress={handleMorePress}>
          <MoreHorizontal size={26} color={theme.colors.icon} strokeWidth={1.5} />
        </Pressable>
            <Pressable style={styles.iconBtn} onPress={handlePickImageForPreview}>
              <ImageIcon size={26} color={theme.colors.icon} strokeWidth={1.5} />
            </Pressable>
            
            <Pressable style={styles.iconBtn}>
              <Mic size={26} color={theme.colors.icon} strokeWidth={1.5} />
            </Pressable>
          </>
        )}
      </View>
    </View>
    
    {showMore && (
      <MoreOptions
        onPickDocument={() => handlePickDocument(onSendFiles, () => setShowMore(false))}
        onPickImage={handlePickImageForPreview}
        onPickVideo={() => handlePickVideo(onSendFiles, () => setShowMore(false))}
        onClose={() => setShowMore(false)}
        theme={theme}
      />
    )}
    </View>
  );
});

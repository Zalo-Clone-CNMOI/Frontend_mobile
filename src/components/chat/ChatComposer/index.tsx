import { useTheme } from '@/src/theme/themeContext';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { ImageIcon, Mic, MoreHorizontal, SendHorizontal, Smile } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { ReplyBar } from './components/ReplyBar';
import { ImagePreview } from './components/ImagePreview';
import { MoreOptions } from './components/MoreOptions';
import { SmartReplyChips } from '../SmartReplyChips';
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
  conversationId?: string;
  userId?: string;
  onSmartReplyDismiss?: () => void;
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
  conversationId,
  userId,
  onSmartReplyDismiss,
}: ChatComposerProps) {
  const theme = useTheme();
  const [showMore, setShowMore] = useState(false);
  const [selectedImages, setSelectedImages] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  const handleToggleVoiceRecord = async () => {
    try {
      if (!isRecording) {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Không có quyền micro', 'Vui lòng cấp quyền micro để ghi âm.');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const nextRecording = new Audio.Recording();
        await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await nextRecording.startAsync();

        setRecording(nextRecording);
        setIsRecording(true);
        return;
      }

      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (!uri) {
        Alert.alert('Ghi âm thất bại', 'Không lấy được file ghi âm.');
        return;
      }

      const voiceFile: DocumentPicker.DocumentPickerAsset = {
        uri,
        name: `voice_${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      } as DocumentPicker.DocumentPickerAsset;

      onSendFiles([voiceFile]);
    } catch {
      setIsRecording(false);
      setRecording(null);
      Alert.alert('Ghi âm thất bại', 'Không thể ghi âm. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  useEffect(() => {
    if (value.length > 0 && onSmartReplyDismiss) {
      onSmartReplyDismiss();
    }
  }, [value, onSmartReplyDismiss]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
    
    {/* Phần Reply hoặc Image Preview (nếu có) */}
    <View style={styles.topSection}>
      {conversationId && (
        <SmartReplyChips
          conversationId={conversationId}
          userId={userId || ''}
          onSelect={(suggestion) => onChangeText(suggestion)}
          onDismiss={onSmartReplyDismiss || (() => {})}
        />
      )}
      {!!editingTo && <ReplyBar type="edit" text={editingTo.text} onCancel={onCancelEdit || (() => {})} theme={theme} />}
      {selectedImages.length > 0 && <ImagePreview images={selectedImages} onRemove={handleRemoveImage} onAddMore={handlePickImageForPreview} theme={theme} />}
      {!!replyingTo && !editingTo && <ReplyBar type="reply" senderName={replyingTo.senderName} text={replyingTo.text} onCancel={onCancelReply || (() => {})} theme={theme} />}
    </View>
    {isRecording && (
      <View style={styles.recordingBanner}>
        <View style={styles.recordingLeft}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Dang ghi am tin nhan thoai</Text>
        </View>
        <Text style={styles.recordingText}>Cham Mic de gui</Text>
      </View>
    )}

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
          placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.35)' : '#999'}
          style={[styles.input, { color: theme.colors.text }]}
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
            
            <Pressable
              style={[styles.iconBtn, isRecording && styles.micActiveBtn]}
              onPress={handleToggleVoiceRecord}
            >
              <Mic size={26} color={isRecording ? '#0A5CC2' : theme.colors.icon} strokeWidth={1.5} />
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

import { useTheme } from '@/src/theme/themeContext';
import { Camera, Check, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NETWORK_CONFIG } from '@/src/config/network';
import { updateConversation, getConversationDetail } from '@/src/services/conversationsApi';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useAuth } from '@/src/contexts/AuthContext';
import * as mediaService from '@/src/services/mediaService';
import type { MediaFileInput } from '@/src/types/media';

type GroupInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  currentName: string;
  currentAvatar: string | null;
  myRole: 'owner' | 'admin' | 'member';
};

export function GroupInfoModal({
  visible,
  onClose,
  conversationId,
  currentName,
  currentAvatar,
  myRole,
}: GroupInfoModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const updateChat = useChatsStore((state) => state.updateChat);

  const [name, setName] = useState(currentName);
  const [avatarUri, setAvatarUri] = useState<string | null>(currentAvatar);
  const [avatarFile, setAvatarFile] = useState<MediaFileInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [localRole, setLocalRole] = useState<'owner' | 'admin' | 'member'>(myRole);

  // Fetch myRole from API when modal opens
  useEffect(() => {
    if (visible && conversationId) {
      getConversationDetail(conversationId)
        .then((response) => {
          const data = response.data?.data;
          if (data?.mySettings?.role) {
            setLocalRole(data.mySettings.role);
          }
        })
        .catch((error) => {
        });
    }
  }, [visible, conversationId]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setAvatarFile({
          uri: asset.uri,
          name: asset.fileName || 'group-avatar.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleSave = async () => {
    if (localRole !== 'owner') {
      Alert.alert('Lỗi', 'Chỉ chủ nhóm mới có thể chỉnh sửa thông tin nhóm');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }

    setLoading(true);
    try {
      const payload: { name?: string; avatarUrl?: string } = {};
      
      if (name !== currentName) {
        payload.name = name.trim();
      }
      
      // Upload avatar to S3 if changed
      if (avatarUri !== currentAvatar && avatarFile && authUser?.id) {
        const uploadResult = await mediaService.uploadMedia(avatarFile, authUser.id);
        // Ensure key has prefix for backend validation
        const key = uploadResult.key;
        const formattedKey = key.startsWith('public/') || key.startsWith('private/')
          ? key
          : `${uploadResult.visibility}/${key}`;
        payload.avatarUrl = formattedKey;
      }

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const response = await updateConversation(conversationId, payload);
      
      // Update conversation in store (convert key to full URL for display)
      updateChat(conversationId, {
        name: payload.name || currentName,
        avatar: payload.avatarUrl ? `${NETWORK_CONFIG.S3_BASE_URL}/${payload.avatarUrl}` : currentAvatar,
      });

      Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
      onClose();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  if (localRole !== 'owner') {
    // View-only mode for non-owners
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Thông tin nhóm
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {currentAvatar && (
                <Image
                  source={{ uri: currentAvatar }}
                  style={styles.avatar}
                />
              )}
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {currentName}
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.icon }]}>
                Bạn không có quyền chỉnh sửa thông tin nhóm
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Chỉnh sửa nhóm
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.background }]}>
                  <Camera size={32} color={theme.colors.icon} />
                </View>
              )}
              <View style={[styles.avatarEditIcon, { backgroundColor: theme.colors.primary }]}>
                <Camera size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Name input */}
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Tên nhóm"
              placeholderTextColor={theme.colors.icon}
              maxLength={50}
            />

            <Text style={[styles.charCount, { color: theme.colors.icon }]}>
              {name.length}/50
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.saveText}>Đang lưu...</Text>
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.saveText}>Lưu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

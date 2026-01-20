import { useTheme } from '@/src/theme/themeContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatePostScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Request camera permissions on component mount
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Cần cấp quyền truy cập camera để sử dụng tính năng này');
      }
    })();
  }, []);

  const handleAddFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri;
        setSelectedImages(prev => [...prev, newImageUri]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở camera. Vui lòng thử lại.');
      console.error('Camera error:', error);
    }
  };

  const handleAddFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        selectionLimit: 5 - selectedImages.length, // Limit to 5 images total
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUris = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
        setSelectedImages(prev => [...prev, ...newImageUris].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh. Vui lòng thử lại.');
      console.error('Gallery error:', error);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung hoặc thêm hình ảnh');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Here you would typically:
      // 1. Upload images to server
      // 2. Create post via API
      // 3. Navigate back to timeline
      
      Alert.alert('Thành công', 'Bài viết đã được đăng thành công!');
      router.back();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng bài viết. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (postContent.trim() || selectedImages.length > 0) {
      Alert.alert(
        'Hủy bài viết',
        'Bạn có chắc muốn hủy bài viết này?',
        [
          { text: 'Không', style: 'cancel' },
          { text: 'Có', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <X size={20} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('create_post.title', 'Tạo bài viết')}
        </Text>
        
        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.headerButton, { opacity: isSubmitting ? 0.5 : 1 }]}
          disabled={isSubmitting}
        >
          <Send size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?u=current-user' }}
            style={[styles.userAvatar, { backgroundColor: theme.colors.background }]}
          />
          <View>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {t('create_post.you', 'Bạn')}
            </Text>
            <Text style={[styles.postTime, { color: theme.colors.icon }]}>
              {t('create_post.now', 'Bây giờ')}
            </Text>
          </View>
        </View>

        {/* Post Input */}
        <TextInput
          style={[
            styles.postInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
            }
          ]}
          placeholder={t('create_post.placeholder', 'Bạn đang nghĩ gì?')}
          placeholderTextColor={theme.colors.icon}
          multiline
          value={postContent}
          onChangeText={setPostContent}
          autoFocus
        />

        {/* Images */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Media Options */}
        <View style={[styles.mediaOptions, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.mediaOption} onPress={handleAddFromCamera}>
            <Camera size={20} color={theme.colors.primary} />
            <Text style={[styles.mediaOptionText, { color: theme.colors.text }]}>
              {t('create_post.add_photo', 'Thêm ảnh')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mediaOption} onPress={handleAddFromGallery}>
            <ImageIcon size={20} color={theme.colors.primary} />
            <Text style={[styles.mediaOptionText, { color: theme.colors.text }]}>
              {t('create_post.add_from_gallery', 'Thêm từ thư viện')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 14,
    marginTop: 2,
  },
  postInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 4,
  },
  mediaOptions: {
    borderRadius: 12,
    padding: 16,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  mediaOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});

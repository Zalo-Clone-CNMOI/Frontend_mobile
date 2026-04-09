import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useCreatePostScreenLogic() {
  const router = useRouter();
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Can quyen truy cap', 'Can cap quyen truy cap camera de su dung tinh nang nay');
      }
    })();
  }, []);

  const handleAddFromCamera = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri;
        setSelectedImages((prev) => [...prev, newImageUri]);
      }
    } catch {
      Alert.alert('Loi', 'Khong the mo camera. Vui long thu lai.');
    }
  }, []);

  const handleAddFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        quality: 0.8,
        selectionLimit: 5 - selectedImages.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUris = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...newImageUris].slice(0, 5));
      }
    } catch {
      Alert.alert('Loi', 'Khong the mo thu vien anh. Vui long thu lai.');
    }
  }, [selectedImages.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      Alert.alert('Thong bao', 'Vui long nhap noi dung hoac them hinh anh');
      return;
    }

    setIsSubmitting(true);

    try {
      Alert.alert('Thanh cong', 'Bai viet da duoc dang thanh cong!');
      router.back();
    } catch {
      Alert.alert('Loi', 'Khong the dang bai viet. Vui long thu lai.');
    } finally {
      setIsSubmitting(false);
    }
  }, [postContent, router, selectedImages.length]);

  const handleCancel = useCallback(() => {
    if (postContent.trim() || selectedImages.length > 0) {
      Alert.alert('Huy bai viet', 'Ban co chac muon huy bai viet nay?', [
        { text: 'Khong', style: 'cancel' },
        { text: 'Co', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [postContent, router, selectedImages.length]);

  return {
    handleAddFromCamera,
    handleAddFromGallery,
    handleCancel,
    handleRemoveImage,
    handleSubmit,
    isSubmitting,
    postContent,
    selectedImages,
    setPostContent,
  };
}

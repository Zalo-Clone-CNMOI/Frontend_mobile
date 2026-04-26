import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const useFilePicker = () => {
  const handlePickDocument = async (onSendFiles: (files: DocumentPicker.DocumentPickerAsset[]) => void, onClose: () => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        onSendFiles(result.assets);
        onClose();
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  const handlePickVideo = async (onSendFiles: (files: DocumentPicker.DocumentPickerAsset[]) => void, onClose: () => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos' as ImagePicker.MediaType],
        quality: 1,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if any video exceeds size limit
        for (const asset of result.assets) {
          const fileSize = asset.fileSize || 0;
          if (fileSize > MAX_VIDEO_SIZE) {
            const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
            Alert.alert(
              'Video quá lớn',
              `Video của bạn (${sizeInMB}MB) vượt quá giới hạn cho phép (50MB). Vui lòng chọn video nhỏ hơn.`,
              [{ text: 'OK' }]
            );
            return;
          }
        }

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
        onClose();
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện video. Vui lòng thử lại.');
    }
  };

  const handlePickImage = async (onImagesSelected: (images: DocumentPicker.DocumentPickerAsset[]) => void, onClose: () => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages: DocumentPicker.DocumentPickerAsset[] = result.assets.map((asset: ImagePicker.ImagePickerAsset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          lastModified: Date.now(),
        }));

        onImagesSelected(newImages);
        onClose();
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh. Vui lòng thử lại.');
    }
  };

  return {
    handlePickDocument,
    handlePickVideo,
    handlePickImage,
  };
};

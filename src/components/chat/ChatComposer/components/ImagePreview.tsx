import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image as ImageIcon, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { styles } from '../styles';

interface ImagePreviewProps {
  images: DocumentPicker.DocumentPickerAsset[];
  onRemove: (index: number) => void;
  onAddMore: () => void;
  theme: any;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemove,
  onAddMore,
  theme,
}) => {
  if (images.length === 0) return null;

  return (
    <View
      style={[
        styles.imagePreviewContainer,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageGridItem}>
            <Image
              source={{ uri: image.uri }}
              style={styles.imageGridThumbnail}
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => onRemove(index)}
            >
              <X size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 9 && (
          <TouchableOpacity
            style={styles.addMoreImageButton}
            onPress={onAddMore}
          >
            <ImageIcon size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

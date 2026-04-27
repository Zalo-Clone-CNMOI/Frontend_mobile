import React from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { FileText } from 'lucide-react-native';
import { MediaItem } from '@/src/hooks/media-gallery/useMediaGallery';
import { getAttachmentUrl } from '@/src/services/mediaService';
import { styles } from './styles';

const GRID_SPACING = 2;
const NUM_COLUMNS = 3;

interface MediaGridProps {
  items: MediaItem[];
  resolvedUrls: Record<string, string>;
  onMediaPress: (item: MediaItem, index: number) => void;
  theme: any;
  authUserId?: string;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  resolvedUrls,
  onMediaPress,
  theme,
  authUserId,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = (screenWidth - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

  const renderGridItem = ({ item, index }: { item: MediaItem; index: number }) => {
    const imageUri = resolvedUrls[item.id] || item.thumbnail || item.uri;

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemWidth, height: itemWidth }]}
        onPress={() => onMediaPress(item, index)}
        activeOpacity={0.8}
      >
        {item.type === 'video' && (
          <View style={styles.videoOverlay}>
            <View style={styles.playButton} />
          </View>
        )}
        {item.type === 'document' && (
          <View style={[styles.fileOverlay, { backgroundColor: theme.colors.primary + '20' }]}>
            <FileText size={24} color={theme.colors.primary} />
          </View>
        )}
        {item.type !== 'document' && (
          <Image
            source={{ uri: imageUri }}
            style={styles.gridImage}
            resizeMode="cover"
            onError={(e) => {
              if (item.key && authUserId && !resolvedUrls[item.id]) {
                getAttachmentUrl({ key: item.key, visibility: 'private' }, authUserId)
                  .then(url => {
                    // Note: This would need to be handled via state in parent component
                    // For now, we'll leave this as a placeholder
                  })
                  .catch(err => {});
              }
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderGridItem}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.gridContainer}
      getItemLayout={(data, index) => ({
        length: itemWidth,
        offset: itemWidth * index,
        index,
      })}
    />
  );
};

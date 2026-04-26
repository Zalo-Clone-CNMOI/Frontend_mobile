import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { MediaItem } from '../hooks/useMediaGallery';
import { formatFileSize, formatDate } from '@/src/utils/formatters';
import { styles } from '../styles';

interface MediaListProps {
  items: MediaItem[];
  onMediaPress: (item: MediaItem, index: number) => void;
  theme: any;
}

export const MediaList: React.FC<MediaListProps> = ({
  items,
  onMediaPress,
  theme,
}) => {
  const renderListItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => onMediaPress(item, 0)}
      activeOpacity={0.8}
    >
      <View style={styles.listThumbnail}>
        {item.type !== 'document' ? (
          <Image source={{ uri: item.thumbnail || item.uri }} style={styles.listImage} />
        ) : (
          <View style={[styles.listFileIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <FileText size={24} color={theme.colors.primary} />
          </View>
        )}
        {item.type === 'video' && (
          <View style={styles.listVideoBadge}>
            <Text style={styles.listVideoText}>Video</Text>
          </View>
        )}
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.listMeta, { color: theme.colors.icon }]}>
          {item.senderName} • {formatFileSize(item.size)}
        </Text>
        <Text style={[styles.listDate, { color: theme.colors.icon }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderListItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

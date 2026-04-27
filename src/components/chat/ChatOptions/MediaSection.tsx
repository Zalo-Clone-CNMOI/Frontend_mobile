import { FileText, Play, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { MediaItem } from './hooks/useMediaGallery';
import { styles } from './styles';

interface MediaSectionProps {
  theme: any;
  mediaItems: MediaItem[];
  loading: boolean;
  error: string | null;
  onViewAll: () => void;
  onMediaPress: (item: MediaItem) => void;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  theme,
  mediaItems,
  loading,
  error,
  onViewAll,
  onMediaPress,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={styles.mediaLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <Text style={[styles.mediaErrorText, { color: theme.colors.textSecondary }]}>
        {error}
      </Text>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <Text style={[styles.noMediaText, { color: theme.colors.textSecondary }]}>
        {t('chat_options.no_media')}
      </Text>
    );
  }

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity style={styles.mediaItem} onPress={() => onMediaPress(item)}>
      {item.type === 'document' ? (
        <View
          style={[
            styles.documentIconContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <FileText size={32} color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <Image source={{ uri: item.thumbnail || item.uri }} style={styles.mediaThumbnail} />
          {item.type === 'video' && (
            <View style={styles.playIconContainer}>
              <Play size={24} color="#fff" fill="#fff" />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.mediaSection, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.mediaSectionHeader, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.mediaSectionTitle, { color: theme.colors.text }]}>
          {t('chat_options.media_files_links')}
        </Text>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={onViewAll}>
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
            {t('common.view_all')}
          </Text>
          <ChevronRight size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={mediaItems.slice(0, 10)}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaList}
      />
    </View>
  );
};

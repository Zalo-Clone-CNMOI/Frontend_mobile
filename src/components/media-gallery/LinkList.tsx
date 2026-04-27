import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link as LinkIcon } from 'lucide-react-native';
import { LinkItem } from '@/src/hooks/media-gallery/useMediaGallery';
import { formatDate } from '@/src/utils/formatters';
import { styles } from './styles';

interface LinkListProps {
  items: LinkItem[];
  onLinkPress: (link: LinkItem) => void;
  theme: any;
}

export const LinkList: React.FC<LinkListProps> = ({
  items,
  onLinkPress,
  theme,
}) => {
  const renderLinkItem = ({ item }: { item: LinkItem }) => (
    <TouchableOpacity
      style={[styles.linkItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => onLinkPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.linkIcon, { backgroundColor: theme.colors.primary + '20' }]}>
        <LinkIcon size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.linkInfo}>
        <Text style={[styles.linkUrl, { color: theme.colors.text }]} numberOfLines={1}>
          {item.url}
        </Text>
        {item.title && (
          <Text style={[styles.linkTitle, { color: theme.colors.icon }]} numberOfLines={1}>
            {item.title}
          </Text>
        )}
        <Text style={[styles.linkMeta, { color: theme.colors.icon }]}>
          {item.senderName} • {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderLinkItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

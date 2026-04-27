import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MediaType } from '@/src/hooks/media-gallery/useMediaGallery';
import { styles } from './styles';

interface FilterTabsProps {
  activeTab: MediaType;
  onTabChange: (tab: MediaType) => void;
  tabCounts: Record<MediaType, number>;
  theme: any;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeTab,
  onTabChange,
  tabCounts,
  theme,
}) => {
  const { t } = useTranslation();

  const tabs: { key: MediaType; label: string }[] = [
    { key: 'all', label: t('media_gallery.all') },
    { key: 'images', label: t('media_gallery.images') },
    { key: 'videos', label: t('media_gallery.videos') },
    { key: 'files', label: t('media_gallery.files') },
    { key: 'links', label: t('media_gallery.links') },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? '#fff' : theme.colors.text },
            ]}
          >
            {tab.label} ({tabCounts[tab.key]})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

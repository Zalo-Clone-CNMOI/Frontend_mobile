import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/theme/themeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaViewerModal } from '@/src/components/chat/MediaViewerModal';
import { SearchHeader } from './components/SearchHeader';
import { FilterTabs } from './components/FilterTabs';
import { ViewModeToggle } from './components/ViewModeToggle';
import { MediaGrid } from './components/MediaGrid';
import { MediaList } from './components/MediaList';
import { LinkList } from './components/LinkList';
import { useMediaGallery, MediaItem, LinkItem } from './hooks/useMediaGallery';
import { styles } from './styles';

export default function MediaGalleryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { conversationId, chatName } = useLocalSearchParams<{ conversationId: string; chatName: string }>();

  const {
    activeTab,
    viewMode,
    searchQuery,
    loading,
    error,
    resolvedUrls,
    filteredItems,
    filteredLinks,
    tabCounts,
    isLinksTab,
    displayItems,
    setActiveTab,
    setViewMode,
    setSearchQuery,
    setAuthUserId,
  } = useMediaGallery(conversationId);

  // Media viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Set auth user ID for URL resolution - use ref to avoid useEffect
  const authUserIdRef = useRef(authUser?.id);
  if (authUserIdRef.current !== authUser?.id) {
    authUserIdRef.current = authUser?.id;
    setAuthUserId(authUser?.id);
  }

  // Handle media item press
  const handleMediaPress = (item: MediaItem, index: number) => {
    setViewerInitialIndex(index);
    setViewerVisible(true);
  };

  // Handle link press
  const handleLinkPress = (link: LinkItem) => {
    // Open in browser
    // Linking.openURL(link.url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: chatName || t('media_gallery.title'),
          headerStyle: { backgroundColor: theme.colors.statusBar },
          headerTintColor: theme.colors.textHeader,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={28} color={theme.colors.textHeader} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search Bar */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
      />

      {/* Tabs & View Mode Row */}
      <View style={styles.tabsRow}>
        <FilterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabCounts={tabCounts}
          theme={theme}
        />

        {/* View Mode Toggle (only for media tabs) */}
        {!isLinksTab && (
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            theme={theme}
          />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.colors.icon }]}>{error}</Text>
        </View>
      ) : displayItems.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
            {isLinksTab ? t('media_gallery.no_links') : t('media_gallery.no_media')}
          </Text>
        </View>
      ) : isLinksTab ? (
        <LinkList
          items={filteredLinks}
          onLinkPress={handleLinkPress}
          theme={theme}
        />
      ) : viewMode === 'grid' ? (
        <MediaGrid
          items={filteredItems}
          resolvedUrls={resolvedUrls}
          onMediaPress={handleMediaPress}
          theme={theme}
          authUserId={authUser?.id}
        />
      ) : (
        <MediaList
          items={filteredItems}
          onMediaPress={handleMediaPress}
          theme={theme}
        />
      )}

      {/* Media Viewer Modal */}
      <MediaViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        items={filteredItems}
        initialIndex={viewerInitialIndex}
        conversationId={conversationId}
      />
    </SafeAreaView>
  );
}

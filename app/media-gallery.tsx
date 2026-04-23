import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/theme/themeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, Grid3X3, LayoutList, Link as LinkIcon, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages } from '@/src/services/messagesApi';
import { getAttachmentUrl } from '@/src/services/mediaService';
import { MediaViewerModal } from '@/src/components/chat/MediaViewerModal';

const GRID_SPACING = 2;
const NUM_COLUMNS = 3;

type MediaType = 'all' | 'images' | 'videos' | 'files' | 'links';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uri: string;
  thumbnail?: string;
  name: string;
  size: number;
  createdAt: string;
  senderName?: string;
  senderId?: string;
  messageId?: string;
  key?: string;
}

interface LinkItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt: string;
  senderName?: string;
}

export default function MediaGalleryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { conversationId, chatName } = useLocalSearchParams<{ conversationId: string; chatName: string }>();

  const [activeTab, setActiveTab] = useState<MediaType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Media viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Resolve URLs for media items
  useEffect(() => {
    const resolveUrls = async () => {
      if (!authUser?.id || mediaItems.length === 0) return;
      
      const urls: Record<string, string> = {};
      
      // Resolve first 20 items only for performance
      for (const item of mediaItems.slice(0, 20)) {
        if (item.uri && !resolvedUrls[item.id]) {
          try {
            // If URL already valid, use it. Otherwise get presigned URL
            if (item.uri.includes('X-Amz-Signature') || item.uri.includes('?')) {
              // Already presigned, might be expired though
              urls[item.id] = item.uri;
            } else {
              // Need to get presigned URL from key
              const key = item.uri.replace(S3_BASE_URL + '/', '');
              if (key && key !== item.uri) {
                const presignedUrl = await getAttachmentUrl({ key, visibility: 'private' }, authUser.id);
                urls[item.id] = presignedUrl;
              } else {
                urls[item.id] = item.uri;
              }
            }
          } catch (err) {
            urls[item.id] = item.uri; // fallback
          }
        }
      }
      
      setResolvedUrls(prev => ({ ...prev, ...urls }));
    };
    
    resolveUrls();
  }, [mediaItems, authUser?.id]);
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = (screenWidth - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

  // Fetch media and links
  useEffect(() => {
    if (conversationId) {
      fetchConversationContent();
    }
  }, [conversationId]);

  const fetchConversationContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all messages with timeout
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API Timeout after 10s')), 10000)
      );
      
      const response = await Promise.race([
        getMessages(conversationId, 50),
        timeoutPromise
      ]) as any;
      
      
      const messages = response?.data?.items || [];
      
      
      const media: MediaItem[] = [];
      const links: LinkItem[] = [];
      
      messages.forEach((msg: any, msgIndex: number) => {
        const msgId = msg.id || msg.messageId;
        const senderName = msg.sender?.fullName || msg.senderName || 'Unknown';
        const senderId = msg.senderId || msg.sender?.id;
        const createdAt = msg.createdAt || msg.timestamp;
        
        // Extract attachments
        const attachments = msg.attachments || msg.metadata?.attachments || [];
        
        
        attachments.forEach((att: any, index: number) => {
          // API returns: type (image/video/audio/document), contentType (mime), key, url
          // Use att.type directly if valid, otherwise detect from contentType
          let type: MediaItem['type'] = att.type;
          if (!type || !['image', 'video', 'audio', 'document'].includes(type)) {
            type = getMediaType(att.contentType || att.content_type || att.mimeType);
          }
          
          
          // Use URL from backend if available, otherwise build from key
          const uri = att.url || (att.key ? `${S3_BASE_URL}/${att.key}` : null);
          const thumbnailUri = att.thumbnail_url || att.thumbnailUrl || uri;
          
          if (!uri) {
            // Attachment missing URL
          }
          
          media.push({
            id: `${msgId}-att-${index}`,
            type,
            uri: uri || '',
            thumbnail: thumbnailUri || '',
            name: att.name || 'file',
            size: att.size || 0,
            createdAt,
            senderName,
            senderId,
            messageId: msgId,
            key: att.key, // Store key for later presigning
          });
        });
        
        // Extract links from message content
        const content = msg.content || msg.text || '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = content.match(urlRegex);
        
        if (foundUrls) {
          foundUrls.forEach((url: string, index: number) => {
            links.push({
              id: `${msgId}-link-${index}`,
              url,
              createdAt,
              senderName,
            });
          });
        }
      });
      
      // Sort by newest first
      media.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      
      setMediaItems(media);
      setLinkItems(links);
    } catch (err: any) {
      setError(`${t('media_gallery.fetch_error')}: ${err?.message || 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [conversationId, t]);

  const getMediaType = (mimeType?: string): MediaItem['type'] => {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Filter items based on active tab and search
  const filteredItems = useMemo(() => {
    let items: MediaItem[] = [];
    
    switch (activeTab) {
      case 'images':
        items = mediaItems.filter(m => m.type === 'image');
        break;
      case 'videos':
        items = mediaItems.filter(m => m.type === 'video');
        break;
      case 'files':
        items = mediaItems.filter(m => m.type === 'document' || m.type === 'audio');
        break;
      case 'all':
      default:
        items = mediaItems;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.senderName?.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [mediaItems, activeTab, searchQuery]);

  const filteredLinks = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return linkItems.filter(link => 
        link.url.toLowerCase().includes(query) ||
        link.title?.toLowerCase().includes(query) ||
        link.senderName?.toLowerCase().includes(query)
      );
    }
    return linkItems;
  }, [linkItems, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: mediaItems.length,
    images: mediaItems.filter(m => m.type === 'image').length,
    videos: mediaItems.filter(m => m.type === 'video').length,
    files: mediaItems.filter(m => m.type === 'document' || m.type === 'audio').length,
    links: linkItems.length,
  }), [mediaItems, linkItems]);

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

  // Render grid item
  const renderGridItem = ({ item, index }: { item: MediaItem; index: number }) => {
    // Use resolved presigned URL if available, otherwise use original
    const imageUri = resolvedUrls[item.id] || item.thumbnail || item.uri;
    
    
    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemWidth, height: itemWidth }]}
        onPress={() => handleMediaPress(item, index)}
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
              // Try to resolve URL again if failed
              if (item.key && authUser?.id && !resolvedUrls[item.id]) {
                getAttachmentUrl({ key: item.key, visibility: 'private' }, authUser.id)
                  .then(url => {
                    setResolvedUrls(prev => ({ ...prev, [item.id]: url }));
                  })
                  .catch(err => {/* Failed to resolve on error */});
              }
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Render list item
  const renderListItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleMediaPress(item, 0)}
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

  // Render link item
  const renderLinkItem = ({ item }: { item: LinkItem }) => (
    <TouchableOpacity
      style={[styles.linkItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleLinkPress(item)}
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const tabs: { key: MediaType; label: string }[] = [
    { key: 'all', label: t('media_gallery.all') },
    { key: 'images', label: t('media_gallery.images') },
    { key: 'videos', label: t('media_gallery.videos') },
    { key: 'files', label: t('media_gallery.files') },
    { key: 'links', label: t('media_gallery.links') },
  ];

  const isLinksTab = activeTab === 'links';
  const displayItems = isLinksTab ? filteredLinks : filteredItems;

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
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <Search size={20} color={theme.colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder={t('media_gallery.search_placeholder')}
          placeholderTextColor={theme.colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs & View Mode Row */}
      <View style={styles.tabsRow}>
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
              onPress={() => setActiveTab(tab.key)}
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

        {/* View Mode Toggle (only for media tabs) */}
        {!isLinksTab && (
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeActive]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3X3 size={20} color={viewMode === 'grid' ? theme.colors.primary : theme.colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
              onPress={() => setViewMode('list')}
            >
              <LayoutList size={20} color={viewMode === 'list' ? theme.colors.primary : theme.colors.icon} />
            </TouchableOpacity>
          </View>
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
        <FlatList
          data={filteredLinks}
          keyExtractor={(item) => item.id}
          renderItem={renderLinkItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : viewMode === 'grid' ? (
        <FlatList
          data={filteredItems}
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
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContainer}
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

const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    padding: GRID_SPACING,
    gap: GRID_SPACING,
  },
  gridItem: {
    margin: GRID_SPACING / 2,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  headerButton: {
    marginLeft: -8,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 16,
    gap: 8,
  },
  tabsContainer: {
    flexGrow: 0,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  viewModeActive: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  fileOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  listThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listFileIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listVideoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  listVideoText: {
    color: '#fff',
    fontSize: 10,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  listDate: {
    fontSize: 12,
  },
  linkItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  linkUrl: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  linkTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  linkMeta: {
    fontSize: 12,
  },
});

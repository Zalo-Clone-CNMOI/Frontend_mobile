import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getMessages } from '@/src/services/messagesApi';
import { getAttachmentUrl } from '@/src/services/mediaService';

const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com';

export type MediaType = 'all' | 'images' | 'videos' | 'files' | 'links';

export interface MediaItem {
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

export interface LinkItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt: string;
  senderName?: string;
}

export const useMediaGallery = (conversationId: string | undefined) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MediaType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const resolvingRef = useRef(false);
  const authUserIdRef = useRef<string | undefined>(undefined);
  const lastResolvedItemsRef = useRef<string>(''); // Track which items have been resolved

  const getMediaType = (mimeType?: string): MediaItem['type'] => {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const fetchConversationContent = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API Timeout after 10s')), 10000)
      );

      const response = await Promise.race([
        getMessages(conversationId, 50),
        timeoutPromise,
      ]) as any;

      const messages = response?.data?.items || [];

      const media: MediaItem[] = [];
      const links: LinkItem[] = [];

      messages.forEach((msg: any, msgIndex: number) => {
        const msgId = msg.id || msg.messageId;
        const senderName = msg.sender?.fullName || msg.senderName || 'Unknown';
        const senderId = msg.senderId || msg.sender?.id;
        const createdAt = msg.createdAt || msg.timestamp;

        const attachments = msg.attachments || msg.metadata?.attachments || [];

        attachments.forEach((att: any, index: number) => {
          let type: MediaItem['type'] = att.type;
          if (!type || !['image', 'video', 'audio', 'document'].includes(type)) {
            type = getMediaType(att.contentType || att.content_type || att.mimeType);
          }

          const uri = att.url || (att.key ? `${S3_BASE_URL}/${att.key}` : null);
          const thumbnailUri = att.thumbnail_url || att.thumbnailUrl || uri;

          if (!uri) return;

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
            key: att.key,
          });
        });

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

  // Resolve URLs for media items - temporarily disabled to debug loading issue
  // TODO: Re-enable once loading is fixed
  /*
  useEffect(() => {
    const resolveUrls = async () => {
      if (!authUserIdRef.current || mediaItems.length === 0 || resolvingRef.current) return;

      // Create a hash of current media item IDs to check if we need to resolve
      const currentItemsHash = mediaItems.map(item => item.id).join(',');
      
      // Skip if we've already resolved these same items
      if (currentItemsHash === lastResolvedItemsRef.current) return;

      resolvingRef.current = true;
      const urls: Record<string, string> = {};

      try {
        for (const item of mediaItems.slice(0, 20)) {
          // Use functional update to get current resolvedUrls value
          if (item.uri) {
            const alreadyResolved = resolvedUrls[item.id];
            if (!alreadyResolved) {
              try {
                if (item.uri.includes('X-Amz-Signature') || item.uri.includes('?')) {
                  urls[item.id] = item.uri;
                } else {
                  const key = item.uri.replace(S3_BASE_URL + '/', '');
                  if (key && key !== item.uri) {
                    const presignedUrl = await getAttachmentUrl({ key, visibility: 'private' }, authUserIdRef.current);
                    urls[item.id] = presignedUrl;
                  } else {
                    urls[item.id] = item.uri;
                  }
                }
              } catch (err) {
                urls[item.id] = item.uri;
              }
            }
          }
        }

        if (Object.keys(urls).length > 0) {
          setResolvedUrls(prev => ({ ...prev, ...urls }));
          lastResolvedItemsRef.current = currentItemsHash;
        }
      } finally {
        resolvingRef.current = false;
      }
    };

    resolveUrls();
  }, [mediaItems, resolvedUrls]);
  */

  // Expose a method to set authUserId from component
  const setAuthUserId = useCallback((userId: string | undefined) => {
    authUserIdRef.current = userId;
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetchConversationContent();
    }
  }, [conversationId]); // Only depend on conversationId, not fetchConversationContent

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

  const tabCounts = useMemo(() => ({
    all: mediaItems.length,
    images: mediaItems.filter(m => m.type === 'image').length,
    videos: mediaItems.filter(m => m.type === 'video').length,
    files: mediaItems.filter(m => m.type === 'document' || m.type === 'audio').length,
    links: linkItems.length,
  }), [mediaItems, linkItems]);

  const isLinksTab = activeTab === 'links';
  const displayItems = isLinksTab ? filteredLinks : filteredItems;

  return {
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
  };
};

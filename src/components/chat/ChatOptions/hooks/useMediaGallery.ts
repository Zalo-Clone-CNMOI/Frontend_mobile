import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getMessages } from '@/src/services/messagesApi';
import { NETWORK_CONFIG } from '@/src/config/network';

const S3_BASE_URL = NETWORK_CONFIG.S3_BASE_URL;

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uri: string;
  thumbnail?: string;
  name: string;
  size: number;
  createdAt: string;
}

interface UseMediaGalleryOptions {
  chatId: string;
  currentUserId?: string;
}

interface UseMediaGalleryReturn {
  mediaItems: MediaItem[];
  loading: boolean;
  error: string | null;
  fetchMedia: () => Promise<void>;
}

const getMediaTypeFromMime = (mimeType?: string): MediaItem['type'] => {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

export const useMediaGallery = ({
  chatId,
  currentUserId,
}: UseMediaGalleryOptions): UseMediaGalleryReturn => {
  const { t } = useTranslation();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!chatId || !currentUserId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getMessages(chatId, 100);
      const messages = response.data?.items || [];

      const attachments: MediaItem[] = [];

      messages.forEach((msg: any) => {
        const msgAttachments = msg.attachments || msg.metadata?.attachments || [];

        msgAttachments.forEach((att: any, index: number) => {
          const type = att.type || getMediaTypeFromMime(att.content_type || att.mimeType);
          if (type === 'image' || type === 'video' || type === 'document') {
            attachments.push({
              id: `${msg.id || msg.messageId}-${index}`,
              type,
              uri: att.url || `${S3_BASE_URL}/${att.key}`,
              thumbnail: att.thumbnail_url || att.thumbnailUrl || att.url || `${S3_BASE_URL}/${att.key}`,
              name: att.name || 'file',
              size: att.size || 0,
              createdAt: msg.createdAt || msg.timestamp,
            });
          }
        });
      });

      attachments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMediaItems(attachments.slice(0, 20));
    } catch (err) {
      setError(t('chat_options.media_error'));
    } finally {
      setLoading(false);
    }
  }, [chatId, currentUserId, t]);

  return { mediaItems, loading, error, fetchMedia };
};

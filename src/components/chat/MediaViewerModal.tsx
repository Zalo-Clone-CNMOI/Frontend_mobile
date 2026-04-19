import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Download, ExternalLink, Play, Share2, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uri: string;
  thumbnail?: string;
  name: string;
  size: number;
  createdAt: string;
  senderName?: string;
  messageId?: string;
}

interface MediaViewerModalProps {
  visible: boolean;
  onClose: () => void;
  items: MediaItem[];
  initialIndex?: number;
  onDelete?: (item: MediaItem) => void;
  conversationId?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function MediaViewerModal({
  visible,
  onClose,
  items,
  initialIndex = 0,
  onDelete,
  conversationId,
}: MediaViewerModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentItem = items[currentIndex];

  // Pan gesture for swipe to dismiss
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setLoading(true);
      setError(null);
    }
  }, [visible, initialIndex]);

  const handleClose = useCallback(() => {
    translateY.value = 0;
    translateX.value = 0;
    scale.value = 1;
    onClose();
  }, [onClose, translateY, translateX, scale]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = event.translationY;
      translateX.value = event.translationX;
      scale.value = Math.max(0.8, 1 - Math.abs(event.translationY) / 500);
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) > 150 || Math.abs(event.velocityY) > 500) {
        translateY.value = withSpring(event.translationY > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT, {}, () => {
          runOnJS(handleClose)();
        });
      } else if (Math.abs(event.translationX) > 100) {
        if (event.translationX > 0 && currentIndex > 0) {
          runOnJS(setCurrentIndex)(currentIndex - 1);
        } else if (event.translationX < 0 && currentIndex < items.length - 1) {
          runOnJS(setCurrentIndex)(currentIndex + 1);
        }
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      } else {
        translateY.value = withSpring(0);
        translateX.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleDownload = async () => {
    if (!currentItem) return;
    
    // TODO: Implement file download using expo-file-system
    Alert.alert(
      t('media_viewer.download_title'),
      t('media_viewer.download_not_implemented')
    );
  };

  const handleShare = async () => {
    if (!currentItem) return;
    
    try {
      // Share using the URL directly
      Alert.alert(
        t('media_viewer.share_title'),
        t('media_viewer.share_message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.copy_link'),
            onPress: () => {
              // Copy link to clipboard
              // Clipboard.setString(currentItem.uri);
              Alert.alert(t('common.success'), t('media_viewer.link_copied'));
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = () => {
    if (!currentItem || !onDelete) return;
    
    Alert.alert(
      t('media_viewer.delete_title'),
      t('media_viewer.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete(currentItem);
            if (items.length === 1) {
              handleClose();
            } else if (currentIndex >= items.length - 1) {
              setCurrentIndex(currentIndex - 1);
            }
          },
        },
      ]
    );
  };

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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (!currentItem) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" />
        
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <X size={28} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {currentIndex + 1} / {items.length}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleDownload} style={styles.headerButton}>
                <Download size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 size={24} color="#fff" />
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                  <Trash2 size={24} color="#ff3b30" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Media Content */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.mediaContainer, animatedStyle]}>
              {currentItem.type === 'image' ? (
                <Image
                  source={{ uri: currentItem.uri }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError(t('media_viewer.load_error'));
                  }}
                />
              ) : currentItem.type === 'video' ? (
                <TouchableOpacity
                  style={styles.videoContainer}
                  onPress={() => {
                    Linking.openURL(currentItem.uri).catch(() => {
                      Alert.alert(t('common.error'), t('media_viewer.cannot_open_video'));
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.videoPlayButton}>
                    <Play size={48} color="#fff" fill="#fff" />
                  </View>
                  <Text style={styles.videoText}>{t('media_viewer.tap_to_play')}</Text>
                  <Text style={styles.videoSubtext}>{currentItem.name}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Text style={styles.documentText}>{currentItem.name}</Text>
                </View>
              )}
              
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              
              {error && (
                <View style={styles.errorOverlay}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </Animated.View>
          </GestureDetector>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {currentItem.senderName && `${currentItem.senderName} • `}
              {formatDate(currentItem.createdAt)}
            </Text>
            {currentItem.size > 0 && (
              <Text style={styles.footerSubtext}>
                {formatFileSize(currentItem.size)}
              </Text>
            )}
          </View>

          {/* Thumbnail Strip */}
          {items.length > 1 && (
            <View style={styles.thumbnailStrip}>
              <FlatList
                data={items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setCurrentIndex(index)}
                    style={[
                      styles.thumbnailItem,
                      index === currentIndex && styles.thumbnailActive,
                    ]}
                  >
                    {item.type !== 'document' ? (
                      <Image
                        source={{ uri: item.thumbnail || item.uri }}
                        style={styles.thumbnailImage}
                      />
                    ) : (
                      <View style={styles.thumbnailDoc}>
                        <Text style={styles.thumbnailDocText}>DOC</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.thumbnailList}
                getItemLayout={(data, index) => ({
                  length: 60,
                  offset: 60 * index,
                  index,
                })}
              />
            </View>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  videoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  videoSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  documentPlaceholder: {
    width: SCREEN_WIDTH * 0.8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  documentText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
  },
  footerSubtext: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 4,
  },
  thumbnailStrip: {
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailDoc: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailDocText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

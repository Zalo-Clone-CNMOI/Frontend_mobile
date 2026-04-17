import { StatusBar } from 'expo-status-bar';
import { Download, X } from 'lucide-react-native';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type ImageViewerProps = {
  visible: boolean;
  uri: string | null;
  uris?: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function ImageViewer({ visible, uri, uris, initialIndex = 0, onClose }: ImageViewerProps) {
  const flatListRef = useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const images = useMemo(() => {
    if (uris && uris.length > 0) return uris;
    return uri ? [uri] : [];
  }, [uri, uris]);
  const hasMultiple = images.length > 1;
  const resolvedInitialIndex = useMemo(() => {
    if (images.length === 0) return 0;

    const boundedIndex = Math.min(Math.max(initialIndex, 0), images.length - 1);
    if (images[boundedIndex] === uri) return boundedIndex;

    const matchedIndex = uri ? images.findIndex((imageUri) => imageUri === uri) : -1;
    return matchedIndex >= 0 ? matchedIndex : boundedIndex;
  }, [images, initialIndex, uri]);

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  useEffect(() => {
    if (!visible || images.length === 0) {
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    setShowControls(true);
    setCurrentIndex(resolvedInitialIndex);
    translateY.value = 0;
    scale.value = 1;
  }, [images.length, resolvedInitialIndex, scale, translateY, visible]);

  useEffect(() => {
    if (!visible || !hasMultiple || images.length === 0) return;

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: resolvedInitialIndex,
        animated: false,
      });
    });
  }, [hasMultiple, images.length, resolvedInitialIndex, visible]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const handleThumbnailPress = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        scale.value = 1 - (event.translationY / height) * 0.5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > height * 0.3) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      runOnJS(toggleControls)();
    });

  const viewerGesture = Gesture.Race(panGesture, tapGesture);

  const renderImageItem = ({ item }: { item: string }) => (
    <View style={styles.imageSlide}>
      <Image
        source={{ uri: item }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    </View>
  );

  if (images.length === 0) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" backgroundColor="#000" />
        
        {hasMultiple ? (
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={resolvedInitialIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={() => {
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToOffset({
                  offset: resolvedInitialIndex * width,
                  animated: false,
                });
              });
            }}
          />
        ) : (
          <GestureDetector gesture={viewerGesture}>
            <Animated.View style={[styles.imageContainer, animatedStyle]}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: images[0] }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </GestureDetector>
        )}

        {showControls && (
          <>
            <SafeAreaView style={styles.header}>
              <View style={styles.headerControls}>
                <Pressable onPress={onClose} style={styles.iconBtn}>
                  <X color="#fff" size={24} />
                </Pressable>
                
                {hasMultiple && (
                  <Text style={styles.imageCounter}>
                    {currentIndex + 1}/{images.length}
                  </Text>
                )}
                
                <View style={{ flexDirection: 'row' }}>
                  <Pressable style={styles.iconBtn} onPress={() => {}}>
                    <Download color="#fff" size={22} />
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>

            {hasMultiple && (
              <SafeAreaView style={styles.bottomBar}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailContainer}
                >
                  {images.map((imgUri, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleThumbnailPress(index)}
                      style={[
                        styles.thumbnail,
                        index === currentIndex && styles.activeThumbnail,
                      ]}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </SafeAreaView>
            )}
          </>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSlide: {
    width: width,
    height: height,
  },
  fullImage: {
    width: width,
    height: height,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: 10,
  },
  thumbnailContainer: {
    paddingHorizontal: 10,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    opacity: 0.6,
  },
  activeThumbnail: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});

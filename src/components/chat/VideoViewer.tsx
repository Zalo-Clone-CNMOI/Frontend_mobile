import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';

type VideoViewerProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

export function VideoViewer({ visible, uri, onClose }: VideoViewerProps) {
  const source = useMemo(() => uri || null, [uri]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (visible && source && player) {
      player.play();
    } else if (player) {
      player.pause();
    }
  }, [visible, source, player]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#000" />

        <SafeAreaView style={styles.header}>
          <View style={styles.headerControls}>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <X color="#fff" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.videoWrapper}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls
            fullscreenOptions={{ enable: true }}
            contentFit="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

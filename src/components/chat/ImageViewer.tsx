import React from 'react';
import { 
  Modal, 
  View, 
  Image, 
  Pressable, 
  StyleSheet, 
  Dimensions, 
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Download } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

type ImageViewerProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

export function ImageViewer({ visible, uri, onClose }: ImageViewerProps) {
  if (!uri) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* StatusBar chuyển sang đen hoàn toàn khi xem ảnh */}
        <StatusBar barStyle="light-content" backgroundColor="black" />
        
        <SafeAreaView style={styles.header}>
          <View style={styles.headerControls}>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <X color="#fff" size={24} />
            </Pressable>
            
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <Pressable style={styles.iconBtn} onPress={() => {/* Thêm logic tải ảnh nếu cần */}}>
                <Download color="#fff" size={22} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.imageWrapper}>
          <Image
            source={{ uri }}
            style={styles.fullImage}
            resizeMode="contain"
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
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height,
  },
});
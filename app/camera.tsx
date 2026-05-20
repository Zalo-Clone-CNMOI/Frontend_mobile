import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, RefreshCw, SwitchCamera, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type CameraHandle = {
  takePictureAsync: (options?: { quality?: number }) => Promise<{ uri: string }>;
};

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatId?: string | string[] }>();
  const chatId = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraHandle | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity onPress={requestPermission}>
          <Camera size={40} />
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setPhotoUri(photo.uri);
  };

  const handleUsePhoto = () => {
    if (!photoUri) return;
    if (chatId) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatId, capturedPhotoUri: photoUri },
      });
      return;
    }
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      {!photoUri ? (
        <>
          <CameraView ref={cameraRef as any} style={{ flex: 1 }} facing={facing} />
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
              <SwitchCamera size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.capture} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.iconButton} />
          </View>
        </>
      ) : (
        <>
          <Image source={{ uri: photoUri }} style={{ flex: 1 }} />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setPhotoUri(null)}>
              <RefreshCw size={20} color="#fff" />
              <Text style={styles.actionText}>Chụp lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.useBtn]} onPress={handleUsePhoto}>
              <Text style={styles.actionText}>Dùng ảnh</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iconButton: {
    width: 50,
    alignItems: 'center',
  },
  capture: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minWidth: 120,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  useBtn: {
    backgroundColor: '#0A84FF',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

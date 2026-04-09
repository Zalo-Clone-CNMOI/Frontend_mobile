import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, RefreshCw, SwitchCamera } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

type CameraHandle = {
  takePictureAsync: (options?: { quality?: number }) => Promise<{ uri: string }>;
};

export default function CameraScreen() {
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

  return (
    <View style={{ flex: 1 }}>
      {!photoUri ? (
        <>
          <CameraView ref={cameraRef as any} style={{ flex: 1 }} facing={facing} />
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
          <TouchableOpacity style={styles.retake} onPress={() => setPhotoUri(null)}>
            <RefreshCw size={26} color="#fff" />
          </TouchableOpacity>
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
  retake: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SwitchCamera, X, Zap, ZapOff } from 'lucide-react-native';
import { Colors } from '@/src/constants/Colors';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);

  const windowSize = useMemo(() => {
    const size = Math.min(280, Math.max(220, Math.floor(width * 0.66)));
    return size;
  }, [width]);

  const frameLeft = useMemo(() => Math.max(0, (width - windowSize) / 2), [width, windowSize]);
  const frameTop = useMemo(() => Math.max(0, (height - windowSize) / 2), [height, windowSize]);

  const onBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      if (!result?.data) return;

      scannedRef.current = true;
      setScanned(true);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }

      Alert.alert('Đã quét QR', String(result.data), [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Quét lại',
          onPress: () => {
            scannedRef.current = false;
            setScanned(false);
          },
        },
      ]);
    },
    []
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Cần quyền Camera</Text>
        <Text style={styles.permissionSubtitle}>Vui lòng cho phép để quét mã QR.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Cho phép</Text>
        </Pressable>
        <Pressable style={styles.permissionSecondary} onPress={() => router.back()}>
          <Text style={styles.permissionSecondaryText}>Đóng</Text>
        </Pressable>
      </View>
    );
  }

  const mask = frameLeft;
  const topMask = frameTop;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.mask, { height: topMask }]} />
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.mask, { width: mask, height: windowSize }]} />
          <View style={{ width: windowSize, height: windowSize }} />
          <View style={[styles.mask, { width: mask, height: windowSize }]} />
        </View>
        <View style={[styles.mask, { flex: 1 }]} />
      </View>

      <View
        style={[styles.frameWrap, { width: windowSize, height: windowSize, left: frameLeft, top: frameTop }]}
        pointerEvents="none"
      >
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <X size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Quét mã QR</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.actionBtn} onPress={() => setTorch((v) => !v)}>
          {torch ? <Zap size={20} color="#fff" /> : <ZapOff size={20} color="#fff" />}
          <Text style={styles.actionText}>{torch ? 'Tắt đèn' : 'Bật đèn'}</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => setFacing((v) => (v === 'back' ? 'front' : 'back'))}>
          <SwitchCamera size={20} color="#fff" />
          <Text style={styles.actionText}>Đổi camera</Text>
        </Pressable>
      </View>

      {scanned && (
        <Pressable
          style={styles.rescanPill}
          onPress={() => {
            scannedRef.current = false;
            setScanned(false);
          }}
        >
          <Text style={styles.rescanText}>Chạm để quét lại</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mask: { backgroundColor: 'rgba(0,0,0,0.55)' },
  frameWrap: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderColor: Colors.zaloBlue,
    borderRadius: 10,
  },
  topLeft: { left: -2, top: -2, borderLeftWidth: 4, borderTopWidth: 4 },
  topRight: { right: -2, top: -2, borderRightWidth: 4, borderTopWidth: 4 },
  bottomLeft: { left: -2, bottom: -2, borderLeftWidth: 4, borderBottomWidth: 4 },
  bottomRight: { right: -2, bottom: -2, borderRightWidth: 4, borderBottomWidth: 4 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingHorizontal: 12,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { color: '#fff', fontSize: 12 },
  rescanPill: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 96,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  rescanText: { color: '#fff', fontSize: 13 },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  permissionSubtitle: { color: '#bdbdbd', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  permissionButton: {
    backgroundColor: Colors.zaloBlue,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  permissionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permissionSecondary: { marginTop: 10, padding: 10 },
  permissionSecondaryText: { color: '#8e8e93', fontSize: 14 },
});

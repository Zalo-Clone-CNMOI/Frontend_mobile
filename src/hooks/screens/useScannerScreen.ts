import { useAuth } from '@/src/contexts/AuthContext';
import { NETWORK_CONFIG } from '@/src/config/network';
import api from '@/src/services/http';
import { BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

export function useScannerScreenLogic() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'pending' | 'waiting' | 'confirmed' | 'rejected' | 'expired' | null>(null);
  const [loading, setLoading] = useState(false);

  const windowSize = useMemo(() => {
    const size = Math.min(280, Math.max(220, Math.floor(width * 0.66)));
    return size;
  }, [width]);

  const frameLeft = useMemo(() => Math.max(0, (width - windowSize) / 2), [width, windowSize]);
  const frameTop = useMemo(() => Math.max(0, (height - windowSize) / 2), [height, windowSize]);

  const pollQrStatus = useCallback(async (sid: string) => {
    try {
      const resp = await api.get(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/status/${sid}`);
      const data = resp?.data || {};
      if (data.status === 'waiting') {
        setQrStatus('waiting');
        setTimeout(() => pollQrStatus(sid), 2000);
      } else if (data.status === 'confirmed') {
        setQrStatus('confirmed');
      } else if (data.status === 'rejected') {
        setQrStatus('rejected');
      } else if (data.status === 'expired') {
        setQrStatus('expired');
      }
    } catch {
      setQrStatus('expired');
    }
  }, []);

  const onBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      if (!result?.data) return;

      scannedRef.current = true;
      setScanned(true);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
      }

      const raw = String(result.data).trim();
      setSessionId(raw);
      setQrStatus('waiting');
      pollQrStatus(raw);
    },
    [pollQrStatus],
  );

  const handleConfirm = useCallback(async () => {
    if (!sessionId || !user?.id || !user?.tokens?.accessToken) return;

    setLoading(true);
    try {
      const resp = await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/confirm`, { sessionId }, { headers: { userId: user.id } });
      const data = resp?.data || {};
      if (resp.status >= 200 && resp.status < 300) {
        setQrStatus('confirmed');
        Alert.alert('Thanh cong', 'Da xac nhan QR thanh cong!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Loi', data.message || 'Khong the xac nhan QR');
      }
    } catch {
      Alert.alert('Loi', 'Khong the ket noi may chu');
    } finally {
      setLoading(false);
    }
  }, [router, sessionId, user?.id, user?.tokens?.accessToken]);

  const handleReject = useCallback(async () => {
    if (!sessionId || !user?.id || !user?.tokens?.accessToken) return;

    setLoading(true);
    try {
      const resp = await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/reject`, { sessionId }, { headers: { userId: user.id } });
      const data = resp?.data || {};
      if (resp.status >= 200 && resp.status < 300) {
        setQrStatus('rejected');
        Alert.alert('Da tu choi', 'Ban da tu choi yeu cau QR');
      } else {
        Alert.alert('Loi', data.message || 'Khong the tu choi QR');
      }
    } catch {
      Alert.alert('Loi', 'Khong the ket noi may chu');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.id, user?.tokens?.accessToken]);

  const resetScanSession = useCallback(() => {
    scannedRef.current = false;
    setScanned(false);
    setSessionId(null);
    setQrStatus(null);
  }, []);

  return {
    facing,
    frameLeft,
    frameTop,
    handleConfirm,
    handleReject,
    loading,
    onBarcodeScanned,
    permission,
    qrStatus,
    requestPermission,
    resetScanSession,
    scanned,
    sessionId,
    setFacing,
    setTorch,
    torch,
    windowSize,
  };
}

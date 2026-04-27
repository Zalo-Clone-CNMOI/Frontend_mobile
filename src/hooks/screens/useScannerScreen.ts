import { useAuth } from '@/src/contexts/AuthContext';
import { qrConfirm, qrReject } from '@/src/services/authApi';
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isSubmittingRef = useRef(false);

  const windowSize = useMemo(() => {
    const size = Math.min(280, Math.max(220, Math.floor(width * 0.66)));
    return size;
  }, [width]);

  const frameLeft = useMemo(() => Math.max(0, (width - windowSize) / 2), [width, windowSize]);
  const frameTop = useMemo(() => Math.max(0, (height - windowSize) / 2), [height, windowSize]);

  const resetScanSession = useCallback(() => {
    scannedRef.current = false;
    setScanned(false);
    setSessionId(null);
    setQrStatus(null);
    setShowConfirmModal(false);
    isSubmittingRef.current = false;
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

      if (!raw || raw.length === 0) {
        Alert.alert('Lỗi', 'QR không hợp lệ');
        resetScanSession();
        return;
      }

      if (!user) {
        Alert.alert('Cần đăng nhập', 'Bạn cần đăng nhập để xác thực QR code', [
          {
            text: 'Đăng nhập',
            onPress: () => router.push('/login' as any),
          },
          {
            text: 'Hủy',
            onPress: () => resetScanSession(),
          },
        ]);
        return;
      }

      let parsedSessionId = raw;
      try {
        const parsed = JSON.parse(raw);
        parsedSessionId = parsed.sessionId || raw;
      } catch {
        if (raw.startsWith('qr_')) {
          const parts = raw.split('_');
          if (parts.length >= 2) {
            parsedSessionId = parts[1];
          }
        }
      }
      setSessionId(parsedSessionId);
      setQrStatus('waiting');
      setShowConfirmModal(true);
    },
    [user, router, resetScanSession],
  );

  const handleConfirm = useCallback(async () => {
    if (!sessionId || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setShowConfirmModal(false);

    try {
      await qrConfirm(sessionId);

      setQrStatus('confirmed');
      Alert.alert(
        'Thành công',
        'Đăng nhập thành công trên thiết bị khác',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      let errorMessage = 'Lỗi kết nối, thử lại';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400 || data?.message?.includes('expired')) {
          errorMessage = 'QR đã hết hạn';
          setQrStatus('expired');
        } else if (status === 404 || data?.message?.includes('invalid')) {
          errorMessage = 'QR không hợp lệ';
        } else if (data?.message?.includes('used')) {
          errorMessage = 'QR đã được sử dụng';
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Kết nối quá thời gian, thử lại';
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [sessionId, router]);

  const handleReject = useCallback(async () => {
    if (!sessionId || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setShowConfirmModal(false);

    try {
      await qrReject(sessionId, { reason: 'USER_REJECTED' });

      setQrStatus('rejected');
      Alert.alert('Đã từ chối', 'Bạn đã từ chối yêu cầu đăng nhập');
    } catch (error: any) {
      // Don't show error on reject - user already declined
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [sessionId]);

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
    showConfirmModal,
    setShowConfirmModal,
    sessionId,
    setFacing,
    setTorch,
    torch,
    windowSize,
  };
}

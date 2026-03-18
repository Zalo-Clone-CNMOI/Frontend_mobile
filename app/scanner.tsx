
import { Colors } from '@/src/constants/Colors';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/services/http';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SwitchCamera, X, Zap, ZapOff } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'pending' | 'waiting' | 'confirmed' | 'rejected' | 'expired' | null>(null);
  const [loading, setLoading] = useState(false);



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

      const raw = String(result.data).trim();
      // Expect sessionId from QR
      setSessionId(raw);
      setQrStatus('waiting'); // Set to waiting immediately to show modal
      // Start polling status
      pollQrStatus(raw);
    },
    []
  );



  const pollQrStatus = async (sid: string) => {
    try {
      const resp = await api.get(`/api/auth/qr/status/${sid}`);
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
    } catch (e) {
      console.error('QR status error', e);
      setQrStatus('expired');
    }
  };



  const handleConfirm = async () => {
    if (!sessionId || !user?.id || !user?.tokens?.accessToken) return;

    setLoading(true);
    try {
      const resp = await api.post('/api/auth/qr/confirm', { sessionId }, { headers: { userId: user.id } });
      const data = resp?.data || {};
      if (resp.status >= 200 && resp.status < 300) {
        setQrStatus('confirmed');
        Alert.alert('Thành công', 'Đã xác nhận QR thành công!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              }
            }
          ]
        );
        console.log("session confirmed", data);
      } else {
        Alert.alert('Lỗi', data.message || 'Không thể xác nhận QR');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };



  const handleReject = async () => {

    if (!sessionId || !user?.id || !user?.tokens?.accessToken) return;

    setLoading(true);

    try {

      const resp = await api.post('/api/auth/qr/reject', { sessionId }, { headers: { userId: user.id } });
      const data = resp?.data || {};
      if (resp.status >= 200 && resp.status < 300) {
        setQrStatus('rejected');
        Alert.alert('Đã từ chối', 'Bạn đã từ chối yêu cầu QR');
      } else {
        Alert.alert('Lỗi', data.message || 'Không thể từ chối QR');
      }
    } catch (e) {

      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');

    } finally {

      setLoading(false);

    }

  };



  if (!permission) {

    return <View style={styles.container} />;

  }



  if (!permission.granted) {

    return (

      <View style={styles.permissionContainer}>

        <Text style={styles.permissionTitle}>{t('scanner.permissionTitle')}</Text>

        <Text style={styles.permissionSubtitle}>{t('scanner.permissionSubtitle')}</Text>

        <Pressable style={styles.permissionButton} onPress={requestPermission}>

          <Text style={styles.permissionButtonText}>{t('scanner.permissionButton')}</Text>

        </Pressable>

        <Pressable style={styles.permissionSecondary} onPress={() => router.back()}>

          <Text style={styles.permissionSecondaryText}>{t('scanner.permissionClose')}</Text>

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

        <Text style={styles.title}>{t('scanner.title')}</Text>

        <View style={{ width: 40 }} />

      </View>



      <View style={styles.bottomBar}>

        <Pressable style={styles.actionBtn} onPress={() => setTorch((v) => !v)}>

          {torch ? <Zap size={20} color="#fff" /> : <ZapOff size={20} color="#fff" />}

          <Text style={styles.actionText}>{torch ? t('scanner.touchOff') : t('scanner.flash')}</Text>

        </Pressable>



        <Pressable style={styles.actionBtn} onPress={() => setFacing((v) => (v === 'back' ? 'front' : 'back'))}>

          <SwitchCamera size={20} color="#fff" />

          <Text style={styles.actionText}>{t('scanner.switchCamera')}</Text>

        </Pressable>

      </View>



      {scanned && (

        <Pressable

          style={styles.rescanPill}

          onPress={() => {

            scannedRef.current = false;

            setScanned(false);

            setSessionId(null);

            setQrStatus(null);

          }}

        >

          <Text style={styles.rescanText}>{t('scanner.rescan')}</Text>

        </Pressable>

      )}



      {/* QR Status Modal */}

      {sessionId && qrStatus && (

        <View style={styles.qrModal}>

          <View style={styles.qrModalContent}>

            <Text style={styles.qrModalTitle}>Yêu cầu QR</Text>

            <Text style={styles.qrModalStatus}>

              {qrStatus === 'pending' && 'Đang kiểm tra...'}

              {qrStatus === 'waiting' && 'Chờ xác nhận...'}

              {qrStatus === 'confirmed' && 'Đã xác nhận'}

              {qrStatus === 'rejected' && 'Đã từ chối'}

              {qrStatus === 'expired' && 'Hết hạn'}

            </Text>

            {(qrStatus === 'waiting' || qrStatus === 'pending') && (

              <View style={styles.qrModalActions}>

                <Pressable style={[styles.qrModalBtn, styles.qrConfirm]} onPress={handleConfirm} disabled={loading}>

                  <Text style={styles.qrConfirmText}>{loading ? '...' : 'Xác nhận'}</Text>

                </Pressable>

                <Pressable style={[styles.qrModalBtn, styles.qrReject]} onPress={handleReject} disabled={loading}>

                  <Text style={styles.qrRejectText}>{loading ? '...' : 'Từ chối'}</Text>

                </Pressable>

              </View>

            )}

            {(qrStatus === 'confirmed' || qrStatus === 'rejected' || qrStatus === 'expired') && (

              <Pressable

                style={styles.qrModalClose}

                onPress={() => {

                  setSessionId(null);

                  setQrStatus(null);

                  scannedRef.current = false;

                  setScanned(false);

                }}

              >

                <Text style={styles.qrModalCloseText}>Đóng</Text>

              </Pressable>

            )}

          </View>

        </View>

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

  qrModal: {

    position: 'absolute',

    top: '50%',

    left: 20,

    right: 20,

    marginTop: -80,

    backgroundColor: 'rgba(0,0,0,0.9)',

    borderRadius: 12,

    padding: 16,

    alignItems: 'center',

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.3,

    shadowRadius: 8,

    elevation: 8,

    maxHeight: 160,

  },

  qrModalContent: { alignItems: 'center' },

  qrModalTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 6 },

  qrModalStatus: { color: '#bdbdbd', fontSize: 12, marginBottom: 12 },

  qrModalActions: { flexDirection: 'row', gap: 12, width: '100%' },

  qrModalBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },

  qrConfirm: { backgroundColor: Colors.zaloBlue },

  qrConfirmText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  qrReject: { backgroundColor: '#444' },

  qrRejectText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  qrModalClose: { marginTop: 6 },

  qrModalCloseText: { color: Colors.zaloBlue, fontSize: 12 },

});

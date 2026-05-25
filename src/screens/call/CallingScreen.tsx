import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ChevronDown, Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { playCallingTone, stopRingtone } from '@/src/services/callRingtone';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { isWebRTCAvailable, loadRTCView } from '@/src/utils/webrtcLoader';
import { callMediaManager } from '@/src/services/callMediaManager';

const AVATAR_SIZE = 110;
const GROUP_AVATAR_SIZE = 100;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

let RTCViewComponent: React.ComponentType<any> | null | undefined;

async function resolveRTCViewComponent() {
  if (!isWebRTCAvailable()) {
    RTCViewComponent = null;
    return null;
  }
  if (RTCViewComponent !== undefined) return RTCViewComponent;
  try {
    RTCViewComponent = await loadRTCView();
  } catch {
    RTCViewComponent = null;
  }
  return RTCViewComponent ?? null;
}

interface CallingScreenProps {
  callType?: 'audio' | 'video';
}

export function CallingScreen({ callType = 'audio' }: CallingScreenProps) {
  const { callState, currentCall, localStream, isAudioEnabled, isVideoEnabled, participants, userDisplayNames } = useCallStore();
  const { endCall, toggleCallAudio, toggleCallVideo } = useCallService();
  const router = useRouter();

  const [recipientName, setRecipientName] = useState('');
  const [recipientAvatar, setRecipientAvatar] = useState('');
  const [groupCallName, setGroupCallName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled);
  const [camEnabled, setCamEnabled] = useState(isVideoEnabled);
  const [RTCView, setRTCView] = useState<React.ComponentType<any> | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const isVideoCall = callType === 'video';
  const isGroupCall = currentCall?.conversationType === 'group';
  const conversationId = currentCall?.conversationId;
  const conversationDetail = useConversationDetailStore((s) =>
    conversationId ? s.cache[conversationId]?.conversation ?? null : null
  );

  useEffect(() => {
    playCallingTone();
    return () => { stopRingtone(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveRTCViewComponent().then((vc) => { if (!cancelled) setRTCView(vc); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      stopRingtone();
      router.back();
    } else if (callState === 'active') {
      stopRingtone();
    }
  }, [callState, router]);

  useEffect(() => {
    if (isGroupCall) {
      if (conversationDetail) {
        setGroupCallName(conversationDetail.name || '');
      }
      return;
    }
    const fetchRecipient = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) return;
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          const name = profile.fullName || profile.nickname || '';
          setRecipientName(name);
          setRecipientAvatar(profile.avatarUrl || '');
          useCallStore.getState().setUserDisplayName(userId, name);
        }
      } catch {
        setRecipientName('');
      }
    };
    fetchRecipient();
  }, [currentCall, isGroupCall, conversationDetail, conversationId]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateYAnim, {
          toValue: -5,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateYAnim]);

  useEffect(() => {
    if (callState === 'active' || callState === 'connecting') {
      router.replace({
        pathname: '/call/active',
        params: { callType },
      });
    }
  }, [callState, router, callType]);

  const handleEndCall = useCallback(async () => {
    try {
      await endCall();
      router.back();
    } catch {}
  }, [endCall, router]);

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleCallAudio(next);
  }, [audioEnabled, toggleCallAudio]);

  const handleToggleCamera = useCallback(() => {
    const next = !camEnabled;
    setCamEnabled(next);
    toggleCallVideo(next);
  }, [camEnabled, toggleCallVideo]);

  const handleMinimize = useCallback(() => {
    router.back();
  }, [router]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  const displayName = isGroupCall ? (groupCallName || 'Cuộc gọi nhóm') : (recipientName || 'Đang gọi...');
  const initial = recipientName ? recipientName.charAt(0).toUpperCase() : '?';

  const statusText =
    callState === 'calling'
      ? (isVideoCall ? 'Đang gọi video...' : 'Đang gọi...')
      : 'Đang kết nối...';

  // ==================== GROUP CALL ====================
  if (isGroupCall) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* Full screen video background for video calls */}
        {isVideoCall && localStream && RTCView ? (
          <RTCView streamURL={(localStream as any).toURL?.() ?? localStream} style={StyleSheet.absoluteFill} objectFit="cover" mirror={true} zOrder={0} />
        ) : (
          <View style={styles.groupBgCenter}>
            <View style={styles.groupBgAvatar}>
              <Users size={56} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
        )}
        {/* Overlay content */}
        <SafeAreaView style={styles.groupOverlay}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>{displayName}</Text>
            <View style={styles.groupMemberCount}>
              <Users size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.groupMemberCountText}>{Object.keys(participants).length + 1} thành viên</Text>
            </View>
          </View>

          <View style={styles.groupParticipants}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(participants).map(([uid, p]) => {
                const name = userDisplayNames[uid] || uid.slice(0, 8);
                const initial = (userDisplayNames[uid] || uid).charAt(0).toUpperCase();
                const isRinging = p.status === 'invited';
                const isAccepted = p.status === 'accepted';
                const leftOrRejected = p.status === 'left' || p.status === 'rejected';
                return (
                  <View key={uid} style={styles.groupParticipantItem}>
                    <View style={styles.groupParticipantAvatar}>
                      <Text style={styles.groupParticipantInitial}>{initial}</Text>
                    </View>
                    <View style={styles.groupParticipantInfo}>
                      <Text style={styles.groupParticipantName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.groupParticipantStatus}>
                        {isAccepted ? 'Đã tham gia' : leftOrRejected ? 'Đã rời' : 'Đang đổ chuông'}
                      </Text>
                    </View>
                    <View style={styles.groupCallTypeIcon}>
                      {isVideoCall ? (
                        <Video size={14} color="rgba(255,255,255,0.8)" />
                      ) : (
                        <Phone size={14} color="rgba(255,255,255,0.8)" />
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.groupStatusRow}>
            <View style={styles.groupStatusDot} />
            <Text style={styles.groupStatusText}>Đang đợi trả lời...</Text>
          </View>

          {/* Controls */}
          <View style={styles.groupControls}>
            <TouchableOpacity onPress={handleToggleAudio} activeOpacity={0.7} style={styles.groupCtrlBtn}>
              <View style={[styles.groupCtrlCircle, !audioEnabled && styles.groupCtrlActive]}>
                {audioEnabled ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />}
              </View>
              <Text style={styles.groupCtrlLabel}>{audioEnabled ? 'Mic' : 'Tắt mic'}</Text>
            </TouchableOpacity>

            {isVideoCall && (
              <TouchableOpacity onPress={handleToggleCamera} activeOpacity={0.7} style={styles.groupCtrlBtn}>
                <View style={[styles.groupCtrlCircle, !camEnabled && styles.groupCtrlActive]}>
                  {camEnabled ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />}
                </View>
                <Text style={styles.groupCtrlLabel}>{camEnabled ? 'Camera' : 'Tắt cam'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleMinimize} activeOpacity={0.7} style={styles.groupCtrlBtn}>
              <View style={styles.groupCtrlCircle}>
                <ChevronDown size={22} color="white" />
              </View>
              <Text style={styles.groupCtrlLabel}>Thu gọn</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
              <View style={styles.groupEndCallBtn}>
                <PhoneOff size={28} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 1-1 CALL ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerSection}>
          {/* Avatar with pulse ring */}
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.pulseRingOuter,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRingInner,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            {isVideoCall && localStream && RTCView ? (
              <View style={styles.localVideoPreview}>
                <RTCView streamURL={(localStream as any).toURL?.() ?? localStream} style={styles.localVideoFill} objectFit="cover" mirror={true} zOrder={0} />
              </View>
            ) : recipientAvatar ? (
              <Image source={{ uri: recipientAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>

          {/* Status */}
          <View style={styles.statusRow}>
            {isVideoCall ? (
              <Video size={14} color="rgba(255,255,255,0.4)" />
            ) : (
              <Phone size={14} color="rgba(255,255,255,0.4)" />
            )}
            <Text style={styles.status}>{statusText}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.bottomSection}>
          <View style={styles.oneoneControls}>
            <TouchableOpacity onPress={handleToggleAudio} activeOpacity={0.7} style={styles.ctrlBtn}>
              <View style={[styles.ctrlCircle, !audioEnabled && styles.groupCtrlActive]}>
                {audioEnabled ? <Mic size={20} color="white" /> : <MicOff size={20} color="white" />}
              </View>
            </TouchableOpacity>

            {isVideoCall && (
              <TouchableOpacity onPress={handleToggleCamera} activeOpacity={0.7} style={styles.ctrlBtn}>
                <View style={[styles.ctrlCircle, !camEnabled && styles.groupCtrlActive]}>
                  {camEnabled ? <Video size={20} color="white" /> : <VideoOff size={20} color="white" />}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.endCallWrap}>
              <View style={styles.endCallGlow} />
              <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                <View style={styles.endCallBtn}>
                  <PhoneOff size={32} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.endCallLabel}>Kết thúc</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingBottom: 48 },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  avatarWrapper: { alignItems: 'center', justifyContent: 'center', width: AVATAR_SIZE + 50, height: AVATAR_SIZE + 50, marginBottom: 24 },
  pulseRingOuter: { position: 'absolute', width: AVATAR_SIZE + 50, height: AVATAR_SIZE + 50, borderRadius: (AVATAR_SIZE + 50) / 2, borderWidth: 1.5, borderColor: 'rgba(52,199,89,0.4)' },
  pulseRingInner: { position: 'absolute', width: AVATAR_SIZE + 20, height: AVATAR_SIZE + 20, borderRadius: (AVATAR_SIZE + 20) / 2, borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)' },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)' },
  avatarPlaceholder: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)' },
  avatarInitial: { fontSize: 44, fontWeight: '600', color: 'white' },
  localVideoPreview: { width: AVATAR_SIZE + 10, height: AVATAR_SIZE + 10, borderRadius: (AVATAR_SIZE + 10) / 2, overflow: 'hidden', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)' },
  localVideoFill: { flex: 1 },
  name: { fontSize: 24, fontWeight: '700', color: 'white', textAlign: 'center', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '400' },
  bottomSection: { alignItems: 'center', paddingBottom: 8 },
  oneoneControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8 },
  ctrlBtn: { alignItems: 'center' },
  ctrlCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  endCallWrap: { alignItems: 'center' },
  endCallGlow: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,59,48,0.15)', top: -4 },
  endCallBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  endCallLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 6 },

  // Group call styles
  groupBgCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  groupBgAvatar: { width: GROUP_AVATAR_SIZE + 30, height: GROUP_AVATAR_SIZE + 30, borderRadius: (GROUP_AVATAR_SIZE + 30) / 2, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.15)' },
  groupOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 40, paddingBottom: 24 },
  groupHeader: { alignItems: 'center', paddingHorizontal: 24 },
  groupName: { fontSize: 24, fontWeight: '700', color: 'white', textAlign: 'center', marginBottom: 6 },
  groupMemberCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupMemberCountText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '400' },
  groupParticipants: { flex: 1, paddingHorizontal: 24, marginTop: 16, maxHeight: 260 },
  groupParticipantItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  groupParticipantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  groupParticipantInitial: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  groupParticipantInfo: { flex: 1 },
  groupParticipantName: { fontSize: 13, fontWeight: '500', color: 'white' },
  groupParticipantStatus: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  groupCallTypeIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  groupStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  groupStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' },
  groupStatusText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  groupControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingHorizontal: 24 },
  groupCtrlBtn: { alignItems: 'center', minWidth: 60 },
  groupCtrlCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  groupCtrlActive: { backgroundColor: 'rgba(255,59,48,0.3)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.5)' },
  groupCtrlLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', textAlign: 'center' },
  groupEndCallBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
});

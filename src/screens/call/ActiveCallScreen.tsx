import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  StatusBar,
  Dimensions,
  PanResponder,
} from 'react-native';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Video,
  VideoOff,
  RefreshCw,
  Users,
  ChevronDown,
  Wifi,
} from 'lucide-react-native';
import { isWebRTCAvailable, loadRTCView } from '@/src/utils/webrtcLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { AudioWave } from '@/src/components/call/AudioWave';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIP_WIDTH = 90;
const PIP_HEIGHT = 140;
const CONTROLS_SHOW_DURATION = 4000;

let RTCViewComponent: React.ComponentType<any> | null | undefined;

async function resolveRTCViewComponent() {
  if (!isWebRTCAvailable()) {
    RTCViewComponent = null;
    return null;
  }

  if (RTCViewComponent !== undefined) {
    return RTCViewComponent;
  }

  try {
    RTCViewComponent = await loadRTCView();
  } catch (error) {
    console.warn('[ActiveCallScreen] react-native-webrtc is unavailable:', error);
    RTCViewComponent = null;
  }

  return RTCViewComponent ?? null;
}

interface ActiveCallScreenProps {
  callType?: 'audio' | 'video';
}

export function ActiveCallScreen({ callType: propCallType }: ActiveCallScreenProps) {
  const {
    currentCall,
    isAudioEnabled,
    isVideoEnabled,
    getCallDuration,
    callState,
    localStream,
    participants,
  } = useCallStore();
  const { endCall, toggleCallAudio, toggleCallVideo, switchCamera } = useCallService();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [duration, setDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState('');
  const [pipPosition, setPipPosition] = useState({ x: SCREEN_WIDTH - PIP_WIDTH - 16, y: 60 });

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef(Date.now());

  const callType = propCallType || currentCall?.callType || 'audio';
  const isVideoCall = callType === 'video';
  const remoteUserId = currentCall?.remoteUserId || '';
  const remoteParticipant = remoteUserId ? participants[remoteUserId] : undefined;
  const remoteStream = remoteParticipant?.remoteStream;
  const networkQuality = 'good';
  const [RTCView, setRTCView] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveRTCViewComponent().then((ViewComponent) => {
      if (!cancelled) {
        setRTCView(ViewComponent);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Navigation ---
  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      if (timerRef.current) clearInterval(timerRef.current);
      router.back();
    }
  }, [callState, router]);

  // --- Fetch recipient ---
  useEffect(() => {
    const fetch = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) return;
      try {
        const p = await getUserProfile(userId);
        if (p) {
          setParticipantName(p.fullName || p.nickname || '');
          setParticipantAvatar(p.avatarUrl || '');
        }
      } catch {}
    };
    fetch();
  }, [currentCall]);

  // --- Timer ---
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDuration(Math.floor(getCallDuration() / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [getCallDuration]);

  // --- Auto-hide controls ---
  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      showControls(false);
    }, CONTROLS_SHOW_DURATION);
  }, []);

  const showControls = useCallback(
    (visible: boolean) => {
      setControlsVisible(visible);
      Animated.timing(controlsOpacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      if (visible) scheduleHideControls();
    },
    [controlsOpacity, scheduleHideControls]
  );

  const handleScreenTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;
    showControls(!controlsVisible);
  }, [controlsVisible, showControls]);

  useEffect(() => {
    showControls(true);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showControls]);

  // --- PiP Drag ---
  const pipPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        setPipPosition((prev) => ({
          x: Math.max(0, Math.min(SCREEN_WIDTH - PIP_WIDTH, prev.x + gesture.dx)),
          y: Math.max(40, Math.min(SCREEN_HEIGHT - PIP_HEIGHT - 120, prev.y + gesture.dy)),
        }));
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // --- Handlers ---
  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleCallAudio(next);
  }, [audioEnabled, toggleCallAudio]);

  const handleToggleSpeaker = useCallback(() => {
    setSpeakerEnabled((p) => !p);
  }, []);

  const handleToggleVideo = useCallback(() => {
    toggleCallVideo(!isVideoEnabled);
  }, [isVideoEnabled, toggleCallVideo]);

  const handleSwitchCamera = useCallback(() => {
    switchCamera();
  }, [switchCamera]);

  const handleEndCall = useCallback(async () => {
    try {
      await endCall();
      router.back();
    } catch {}
  }, [endCall, router]);

  const handleMinimize = useCallback(() => {
    router.back();
  }, [router]);

  // --- Format time ---
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}:${(m % 60).toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ==================== VIDEO CALL UI ====================
  if (isVideoCall) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden={!controlsVisible} />

        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenTap}
          style={StyleSheet.absoluteFill}
        >
          {/* Remote video */}
          {remoteStream && RTCView ? (
            <RTCView
              streamURL={(remoteStream as any).toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false}
              zOrder={0}
            />
          ) : (
            <View style={styles.remotePlaceholder}>
              {participantAvatar ? (
                <Image source={{ uri: participantAvatar }} style={styles.videoAvatar} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {participantName ? participantName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Local PiP */}
          {localStream && RTCView ? (
            <View
              style={[styles.pipContainer, { left: pipPosition.x, top: pipPosition.y }]}
              {...pipPan.panHandlers}
            >
              <RTCView
                streamURL={(localStream as any).toURL()}
                style={styles.pipVideo}
                objectFit="cover"
                mirror={true}
                zOrder={1}
              />
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Controls overlay */}
        <Animated.View
          pointerEvents={controlsVisible ? 'auto' : 'none'}
          style={[styles.videoOverlay, { opacity: controlsOpacity }]}
        >
          <SafeAreaView style={styles.overlaySafe}>
            {/* Top bar */}
            <View style={styles.videoTop}>
              <View style={styles.networkBadge}>
                <Wifi size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.networkText}>
                  {networkQuality === 'good' ? 'Tốt' : 'Yếu'}
                </Text>
              </View>
              <Text style={styles.videoTimer}>{fmt(duration)}</Text>
              <TouchableOpacity onPress={handleMinimize} style={styles.topActionBtn}>
                <ChevronDown size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {/* Center */}
            <View style={styles.videoCenter}>
              <Text style={styles.videoName}>{participantName}</Text>
            </View>

            {/* Bottom controls */}
            <View style={styles.videoControls}>
              <View style={styles.controlsRow}>
                <ControlItem
                  icon={audioEnabled ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />}
                  label="Mic"
                  active={!audioEnabled}
                  onPress={handleToggleAudio}
                />
                <ControlItem
                  icon={isVideoEnabled ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />}
                  label="Camera"
                  active={!isVideoEnabled}
                  onPress={handleToggleVideo}
                />
                <ControlItem
                  icon={<Volume2 size={22} color="white" />}
                  label="Loa"
                  active={speakerEnabled}
                  onPress={handleToggleSpeaker}
                />
                <ControlItem
                  icon={<RefreshCw size={22} color="white" />}
                  label="Xoay"
                  onPress={handleSwitchCamera}
                />
                <ControlItem
                  icon={<Users size={22} color="white" />}
                  label="Thêm"
                  onPress={() => {}}
                />
              </View>

              {/* End call */}
              <View style={styles.endCallRow}>
                <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                  <View style={styles.endCallBtn}>
                    <PhoneOff size={30} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  }

  // ==================== VOICE CALL UI ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.voiceSafe}>
        {/* Tap area to toggle controls */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenTap}
          style={styles.voiceTapArea}
        >
          {/* Top: timer */}
          <View style={styles.voiceTop}>
            <Text style={styles.voiceTimer}>{fmt(duration)}</Text>
          </View>

          {/* Center: avatar + name + wave */}
          <View style={styles.voiceCenter}>
            {participantAvatar ? (
              <Image source={{ uri: participantAvatar }} style={styles.voiceAvatar} />
            ) : (
              <View style={styles.voiceAvatarPlaceholder}>
                <Text style={styles.voiceAvatarInitial}>
                  {participantName ? participantName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <Text style={styles.voiceName}>{participantName}</Text>
            <Text style={styles.voiceStatus}>Đang nói chuyện</Text>
            <AudioWave active />
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <Animated.View
          pointerEvents={controlsVisible ? 'auto' : 'none'}
          style={[styles.voiceControlsWrap, { opacity: controlsOpacity }]}
        >
          <View style={styles.voiceControlsRow}>
            <ControlItem
              icon={audioEnabled ? <Mic size={24} color="white" /> : <MicOff size={24} color="white" />}
              label="Tắt mic"
              active={!audioEnabled}
              onPress={handleToggleAudio}
            />
            <ControlItem
              icon={<Volume2 size={24} color="white" />}
              label="Loa ngoài"
              active={speakerEnabled}
              onPress={handleToggleSpeaker}
            />
            <ControlItem
              icon={<Users size={24} color="white" />}
              label="Thêm"
              onPress={() => {}}
            />
            <ControlItem
              icon={<ChevronDown size={24} color="white" />}
              label="Thu nhỏ"
              onPress={handleMinimize}
            />
          </View>

          <View style={styles.endCallRow}>
            <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
              <View style={styles.endCallBtn}>
                <PhoneOff size={32} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// --- Small reusable control ---
function ControlItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={ctrlStyles.wrap}>
      <View style={[ctrlStyles.circle, active && ctrlStyles.active]}>
        {icon}
      </View>
      <Text style={ctrlStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const ctrlStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    minWidth: 54,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  active: {
    backgroundColor: 'rgba(255,59,48,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.5)',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    textAlign: 'center',
  },
});

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  // --- Video ---
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  remotePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2d2d5e',
  },
  videoAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '600',
    color: 'white',
  },
  pipContainer: {
    position: 'absolute',
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    zIndex: 10,
  },
  pipVideo: {
    flex: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlaySafe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  networkText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  videoTimer: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
  },
  topActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCenter: {
    alignItems: 'center',
  },
  videoName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  videoControls: {
    paddingBottom: 32,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  // --- Voice ---
  voiceSafe: {
    flex: 1,
  },
  voiceTapArea: {
    flex: 1,
  },
  voiceTop: {
    alignItems: 'center',
    paddingTop: 20,
  },
  voiceTimer: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    fontVariant: ['tabular-nums'],
  },
  voiceCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  voiceAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  voiceAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  voiceAvatarInitial: {
    fontSize: 40,
    fontWeight: '600',
    color: 'white',
  },
  voiceName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  voiceStatus: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '400',
    marginBottom: 12,
  },
  voiceControlsWrap: {
    paddingBottom: 32,
  },
  voiceControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  endCallRow: {
    alignItems: 'center',
  },
  endCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

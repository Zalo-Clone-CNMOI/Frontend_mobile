import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  ScrollView,
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
  LogOut,
} from 'lucide-react-native';
import { isWebRTCAvailable, loadRTCView } from '@/src/utils/webrtcLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { AudioWave } from '@/src/components/call/AudioWave';
import { callMediaManager } from '@/src/services/callMediaManager';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { ParticipantList } from '@/src/components/call/ParticipantList';

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
  if (RTCViewComponent !== undefined) return RTCViewComponent;
  try {
    RTCViewComponent = await loadRTCView();
  } catch {
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
    userDisplayNames,
  } = useCallStore();
  const { endCall, leaveCall, toggleCallAudio, toggleCallVideo, switchCamera } = useCallService();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [duration, setDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: SCREEN_WIDTH - PIP_WIDTH - 16, y: 60 });

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef(Date.now());

  const callType = propCallType || currentCall?.callType || 'audio';
  const isVideoCall = callType === 'video';
  const isGroupCall = currentCall?.conversationType === 'group';
  const conversationId = currentCall?.conversationId;
  const conversationDetail = useConversationDetailStore((s) =>
    conversationId ? s.cache[conversationId]?.conversation ?? null : null
  );

  const participantEntries = useMemo(
    () => Object.entries(participants).filter(([, p]) => !p.isLocalUser),
    [participants]
  );
  const remoteUserId = currentCall?.remoteUserId || '';
  const remoteParticipant = remoteUserId ? participants[remoteUserId] : undefined;
  const remoteStream = remoteParticipant?.remoteStream;
  const [RTCView, setRTCView] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveRTCViewComponent().then((vc) => { if (!cancelled) setRTCView(vc); });
    return () => { cancelled = true; };
  }, []);

  // Navigation
  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      if (timerRef.current) clearInterval(timerRef.current);
      router.back();
    }
  }, [callState, router]);

  // Fetch names
  useEffect(() => {
    if (isGroupCall && conversationId) {
      if (conversationDetail) {
        setGroupName(conversationDetail.name || '');
      } else {
        useConversationDetailStore.getState()
          .fetchConversationDetail(conversationId)
          .then(() => {
            const conv = useConversationDetailStore.getState().getConversationDetail(conversationId);
            if (conv) setGroupName(conv.name || '');
          })
          .catch(() => {});
      }
      Object.entries(participants).forEach(([uid]) => {
        if (!userDisplayNames[uid]) {
          getUserProfile(uid).then((p) => {
            if (p) {
              const name = p.fullName || p.nickname || uid;
              useCallStore.getState().setUserDisplayName(uid, name);
            }
          }).catch(() => {});
        }
      });
      return;
    }
    const fetch = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) return;
      try {
        const p = await getUserProfile(userId);
        if (p) {
          setParticipantName(p.fullName || p.nickname || '');
          setParticipantAvatar(p.avatarUrl || '');
          useCallStore.getState().setUserDisplayName(userId, p.fullName || p.nickname || userId);
        }
      } catch {}
    };
    fetch();
  }, [currentCall, isGroupCall, conversationId, conversationDetail, participants, userDisplayNames]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDuration(Math.floor(getCallDuration() / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [getCallDuration]);

  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => showControls(false), CONTROLS_SHOW_DURATION);
  }, []);

  const showControls = useCallback((visible: boolean) => {
    setControlsVisible(visible);
    Animated.timing(controlsOpacity, {
      toValue: visible ? 1 : 0, duration: 300, useNativeDriver: true,
    }).start();
    if (visible) scheduleHideControls();
  }, [controlsOpacity, scheduleHideControls]);

  const handleScreenTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;
    showControls(!controlsVisible);
  }, [controlsVisible, showControls]);

  useEffect(() => {
    showControls(true);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showControls]);

  // PiP Drag
  const pipPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, g) => {
        setPipPosition(p => ({
          x: Math.max(0, Math.min(SCREEN_WIDTH - PIP_WIDTH, p.x + g.dx)),
          y: Math.max(40, Math.min(SCREEN_HEIGHT - PIP_HEIGHT - 120, p.y + g.dy)),
        }));
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleCallAudio(next);
  }, [audioEnabled, toggleCallAudio]);

  const handleToggleSpeaker = useCallback(() => {
    setSpeakerEnabled(p => {
      const next = !p;
      if (next) callMediaManager.enableSpeaker().catch(() => {});
      else callMediaManager.disableSpeaker().catch(() => {});
      return next;
    });
  }, []);

  const handleToggleVideo = useCallback(() => {
    toggleCallVideo(!isVideoEnabled);
  }, [isVideoEnabled, toggleCallVideo]);

  const handleSwitchCamera = useCallback(() => switchCamera(), [switchCamera]);

  const handleEndCall = useCallback(async () => {
    try { await endCall(); router.back(); } catch {}
  }, [endCall, router]);

  const handleLeaveCall = useCallback(async () => {
    try { await leaveCall(); router.back(); } catch {}
  }, [leaveCall, router]);

  const handleMinimize = useCallback(() => router.back(), [router]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const displayName = isGroupCall ? (groupName || 'Cuộc gọi nhóm') : participantName;

  // Build all participants (including local) for group call
  const allParticipants = useMemo(() => {
    if (!isGroupCall) return [];
    const list: Array<{
      userId: string;
      isLocal: boolean;
      stream?: any;
      hasVideo: boolean;
      hasAudio: boolean;
      name: string;
      initial: string;
    }> = [];
    // Local user
    list.push({
      userId: 'local',
      isLocal: true,
      stream: localStream || undefined,
      hasVideo: isVideoCall && isVideoEnabled && !!localStream,
      hasAudio: audioEnabled,
      name: 'Bạn',
      initial: 'B',
    });
    // Remote participants
    participantEntries.forEach(([uid, p]) => {
      list.push({
        userId: uid,
        isLocal: false,
        stream: p.remoteStream,
        hasVideo: isVideoCall && !!(p.remoteStream?.getVideoTracks?.()?.length),
        hasAudio: p.audioEnabled !== false,
        name: userDisplayNames[uid] || uid.slice(0, 8),
        initial: (userDisplayNames[uid] || '?').charAt(0).toUpperCase(),
      });
    });
    return list;
  }, [isGroupCall, localStream, isVideoCall, isVideoEnabled, audioEnabled, participantEntries, userDisplayNames]);

  const totalParticipants = allParticipants.length;

  // ==================== GROUP CALL ====================
  if (isGroupCall) {
    const showGrid = totalParticipants > 2;
    const showSplit = totalParticipants === 2;
    const showSingle = totalParticipants <= 1;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden={!controlsVisible} />
        <TouchableOpacity activeOpacity={1} onPress={handleScreenTap} style={StyleSheet.absoluteFill}>
          {/* Main participant area */}
          {showSingle ? (
            <SingleParticipantView participants={allParticipants} RTCView={RTCView} />
          ) : showSplit ? (
            <SplitParticipantView participants={allParticipants} RTCView={RTCView} />
          ) : showGrid ? (
            totalParticipants <= 4 ? (
              <Grid2x2View participants={allParticipants} RTCView={RTCView} />
            ) : (
              <SpeakerWithThumbnailsView participants={allParticipants} RTCView={RTCView} />
            )
          ) : null}
        </TouchableOpacity>

        {/* Header overlay */}
        <Animated.View pointerEvents={controlsVisible ? 'auto' : 'none'} style={[gcStyles.groupHeader, { opacity: controlsOpacity }]}>
          <SafeAreaView edges={['top']} style={gcStyles.groupHeaderSafe}>
            <View style={gcStyles.groupHeaderContent}>
              <View style={gcStyles.groupHeaderInfo}>
                <View style={gcStyles.groupHeaderAvatar}>
                  <Users size={16} color="rgba(255,255,255,0.8)" />
                </View>
                <View>
                  <Text style={gcStyles.groupHeaderName} numberOfLines={1}>{displayName}</Text>
                  <Text style={gcStyles.groupHeaderCount}>{totalParticipants} thành viên</Text>
                </View>
              </View>
              <View style={gcStyles.groupHeaderTimer}>
                <Text style={gcStyles.groupHeaderTimerText}>{fmt(duration)}</Text>
              </View>
              <TouchableOpacity onPress={handleMinimize} style={gcStyles.groupHeaderMinBtn}>
                <ChevronDown size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Controls overlay */}
        <Animated.View pointerEvents={controlsVisible ? 'auto' : 'none'} style={[gcStyles.groupControlsOverlay, { opacity: controlsOpacity }]}>
          <SafeAreaView edges={['bottom']} style={gcStyles.groupControlsSafe}>
            <View style={gcStyles.groupControlsRow}>
              <GroupControlBtn icon={audioEnabled ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />} label="Mic" active={!audioEnabled} onPress={handleToggleAudio} />
              {isVideoCall && (
                <GroupControlBtn icon={isVideoEnabled ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />} label="Camera" active={!isVideoEnabled} onPress={handleToggleVideo} />
              )}
              <GroupControlBtn icon={<Volume2 size={22} color="white" />} label="Loa" active={speakerEnabled} onPress={handleToggleSpeaker} />
              <GroupControlBtn icon={<Users size={22} color="white" />} label="Thành viên" onPress={() => setShowParticipants(true)} />
              <GroupControlBtn icon={<LogOut size={22} color="#FF9F0A" />} label="Rời" onPress={handleLeaveCall} />
            </View>
            <View style={gcStyles.groupEndRow}>
              <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                <View style={gcStyles.groupEndBtn}><PhoneOff size={30} color="white" /></View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Local PiP for video calls */}
        {isVideoCall && localStream && RTCView && totalParticipants > 1 && (
          <View style={[gcStyles.groupLocalPip, { left: pipPosition.x, top: pipPosition.y }]} {...pipPan.panHandlers}>
            <RTCView streamURL={(localStream as any).toURL?.() ?? localStream} style={gcStyles.groupLocalPipVideo} objectFit="cover" mirror={true} zOrder={1} />
            <View style={gcStyles.groupLocalPipBadge}>
              <Text style={gcStyles.groupLocalPipBadgeText}>Bạn</Text>
            </View>
          </View>
        )}

        <ParticipantList visible={showParticipants} onClose={() => setShowParticipants(false)} participants={participants} localUserId={currentCall?.remoteUserId || ''} />
      </View>
    );
  }

  // ==================== VIDEO CALL (1-1) ====================
  if (isVideoCall) {
    const remoteEntries = participantEntries.filter(([, p]) => p.remoteStream);
    const hasMultipleRemote = remoteEntries.length > 1;
    const gridParticipants = hasMultipleRemote ? remoteEntries : [];
    const showGrid = hasMultipleRemote && gridParticipants.length > 0;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden={!controlsVisible} />
        <TouchableOpacity activeOpacity={1} onPress={handleScreenTap} style={StyleSheet.absoluteFill}>
          {showGrid && RTCView ? (
            <VideoGrid participants={participantEntries} localStream={localStream} RTCView={RTCView} />
          ) : (
            <>
              {remoteStream && RTCView ? (
                <RTCView streamURL={(remoteStream as any).toURL()} style={styles.remoteVideo} objectFit="cover" mirror={false} zOrder={0} />
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
              {localStream && RTCView ? (
                <View style={[styles.pipContainer, { left: pipPosition.x, top: pipPosition.y }]} {...pipPan.panHandlers}>
                  <RTCView streamURL={(localStream as any).toURL()} style={styles.pipVideo} objectFit="cover" mirror={true} zOrder={1} />
                </View>
              ) : null}
            </>
          )}
        </TouchableOpacity>

        <Animated.View pointerEvents={controlsVisible ? 'auto' : 'none'} style={[styles.videoOverlay, { opacity: controlsOpacity }]}>
          <SafeAreaView style={styles.overlaySafe}>
            <View style={styles.videoTop}>
              <View style={styles.networkBadge}>
                <Wifi size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.networkText}>Tốt</Text>
              </View>
              <Text style={styles.videoTimer}>{fmt(duration)}</Text>
              <TouchableOpacity onPress={handleMinimize} style={styles.topActionBtn}>
                <ChevronDown size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            <View style={styles.videoCenter}>
              <Text style={styles.videoName}>{displayName}</Text>
            </View>
            <View style={styles.videoControls}>
              <View style={styles.controlsRow}>
                <ControlItem icon={audioEnabled ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />} label="Mic" active={!audioEnabled} onPress={handleToggleAudio} />
                <ControlItem icon={isVideoEnabled ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />} label="Camera" active={!isVideoEnabled} onPress={handleToggleVideo} />
                <ControlItem icon={<Volume2 size={22} color="white" />} label="Loa" active={speakerEnabled} onPress={handleToggleSpeaker} />
                <ControlItem icon={<RefreshCw size={22} color="white" />} label="Xoay" onPress={handleSwitchCamera} />
              </View>
              <View style={styles.endCallRow}>
                <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                  <View style={styles.endCallBtn}><PhoneOff size={30} color="white" /></View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  }

  // ==================== VOICE CALL (1-1) ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.voiceSafe}>
        <TouchableOpacity activeOpacity={1} onPress={handleScreenTap} style={styles.voiceTapArea}>
          <View style={styles.voiceTop}>
            <Text style={styles.voiceTimer}>{fmt(duration)}</Text>
          </View>
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

        <Animated.View pointerEvents={controlsVisible ? 'auto' : 'none'} style={[styles.voiceControlsWrap, { opacity: controlsOpacity }]}>
          <View style={styles.voiceControlsRow}>
            <ControlItem icon={audioEnabled ? <Mic size={24} color="white" /> : <MicOff size={24} color="white" />} label="Tắt mic" active={!audioEnabled} onPress={handleToggleAudio} />
            <ControlItem icon={<Volume2 size={24} color="white" />} label="Loa ngoài" active={speakerEnabled} onPress={handleToggleSpeaker} />
            <ControlItem icon={<ChevronDown size={24} color="white" />} label="Thu nhỏ" onPress={handleMinimize} />
          </View>
          <View style={styles.endCallRow}>
            <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
              <View style={styles.endCallBtn}><PhoneOff size={32} color="white" /></View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ==================== GROUP CALL SUB-COMPONENTS ====================

function GroupControlBtn({ icon, label, active = false, onPress }: {
  icon: React.ReactNode; label: string; active?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={gcStyles.ctrlWrap}>
      <View style={[gcStyles.ctrlCircle, active && gcStyles.ctrlActive]}>{icon}</View>
      <Text style={gcStyles.ctrlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SingleParticipantView({ participants, RTCView }: {
  participants: Array<any>; RTCView: React.ComponentType<any> | null;
}) {
  const p = participants[0];
  if (!p) return <View style={gcStyles.emptyView} />;
  return (
    <View style={gcStyles.tileFull}>
      {p.hasVideo && p.stream && RTCView ? (
        <RTCView streamURL={(p.stream as any).toURL?.() ?? p.stream} style={gcStyles.tileVideo} objectFit="cover" mirror={p.isLocal} zOrder={0} />
      ) : (
        <View style={gcStyles.tileAvatarBg}>
          <View style={gcStyles.tileAvatarCircle}>
            <Text style={gcStyles.tileAvatarText}>{p.initial}</Text>
          </View>
        </View>
      )}
      <View style={gcStyles.tileLabel}>
        <Text style={gcStyles.tileLabelText}>{p.isLocal ? 'Bạn' : p.name}</Text>
        <View style={gcStyles.tileStatusRow}>
          {!p.hasAudio && <MicOff size={10} color="#FF3B30" />}
        </View>
      </View>
    </View>
  );
}

function SplitParticipantView({ participants, RTCView }: {
  participants: Array<any>; RTCView: React.ComponentType<any> | null;
}) {
  return (
    <View style={gcStyles.splitContainer}>
      {participants.slice(0, 2).map((p) => (
        <View key={p.userId} style={gcStyles.splitPanel}>
          {p.hasVideo && p.stream && RTCView ? (
            <RTCView streamURL={(p.stream as any).toURL?.() ?? p.stream} style={gcStyles.tileVideo} objectFit="cover" mirror={p.isLocal} zOrder={0} />
          ) : (
            <View style={gcStyles.tileAvatarBg}>
              <View style={gcStyles.tileAvatarCircle}>
                <Text style={gcStyles.tileAvatarText}>{p.initial}</Text>
              </View>
            </View>
          )}
          <View style={gcStyles.tileLabel}>
            <Text style={gcStyles.tileLabelText}>{p.isLocal ? 'Bạn' : p.name}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Grid2x2View({ participants, RTCView }: {
  participants: Array<any>; RTCView: React.ComponentType<any> | null;
}) {
  return (
    <View style={gcStyles.gridContainer}>
      {participants.slice(0, 4).map((p) => (
        <View key={p.userId} style={gcStyles.gridTile}>
          {p.hasVideo && p.stream && RTCView ? (
            <RTCView streamURL={(p.stream as any).toURL?.() ?? p.stream} style={gcStyles.tileVideo} objectFit="cover" mirror={p.isLocal} zOrder={0} />
          ) : (
            <View style={gcStyles.tileAvatarBg}>
              <View style={gcStyles.tileAvatarCircleSmall}>
                <Text style={gcStyles.tileAvatarTextSmall}>{p.initial}</Text>
              </View>
            </View>
          )}
          <View style={gcStyles.tileLabel}>
            <Text style={gcStyles.tileLabelText}>{p.isLocal ? 'Bạn' : p.name}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SpeakerWithThumbnailsView({ participants, RTCView }: {
  participants: Array<any>; RTCView: React.ComponentType<any> | null;
}) {
  const speaker = participants[0];
  const thumbnails = participants.slice(1);
  const maxThumbs = 6;
  const visibleThumbs = thumbnails.slice(0, maxThumbs);
  const remainingCount = Math.max(0, thumbnails.length - maxThumbs);

  return (
    <View style={gcStyles.speakerContainer}>
      <View style={gcStyles.speakerMain}>
        {speaker && (
          <>
            {speaker.hasVideo && speaker.stream && RTCView ? (
              <RTCView streamURL={(speaker.stream as any).toURL?.() ?? speaker.stream} style={gcStyles.tileVideo} objectFit="cover" mirror={speaker.isLocal} zOrder={0} />
            ) : (
              <View style={gcStyles.tileAvatarBg}>
                <View style={gcStyles.tileAvatarCircle}>
                  <Text style={gcStyles.tileAvatarText}>{speaker.initial}</Text>
                </View>
              </View>
            )}
            <View style={gcStyles.tileLabel}>
              <Text style={gcStyles.tileLabelText}>{speaker.isLocal ? 'Bạn' : speaker.name}</Text>
            </View>
          </>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={gcStyles.thumbnailScroll} contentContainerStyle={gcStyles.thumbnailContent}>
        {visibleThumbs.map((p) => (
          <View key={p.userId} style={gcStyles.thumbnailCard}>
            {p.hasVideo && p.stream && RTCView ? (
              <RTCView streamURL={(p.stream as any).toURL?.() ?? p.stream} style={gcStyles.thumbVideo} objectFit="cover" mirror={p.isLocal} zOrder={0} />
            ) : (
              <View style={gcStyles.thumbAvatarBg}>
                <Text style={gcStyles.thumbAvatarText}>{p.initial}</Text>
              </View>
            )}
            <View style={gcStyles.thumbLabel}>
              <Text style={gcStyles.thumbLabelText} numberOfLines={1}>{p.isLocal ? 'Bạn' : p.name}</Text>
            </View>
          </View>
        ))}
        {remainingCount > 0 && (
          <View style={gcStyles.thumbnailCard}>
            <View style={gcStyles.thumbMoreBg}>
              <Text style={gcStyles.thumbMoreText}>+{remainingCount}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ==================== 1-1 VIDEO GRID ====================
function VideoGrid({ participants, localStream, RTCView }: {
  participants: Array<[string, any]>; localStream: any; RTCView: React.ComponentType<any>;
}) {
  const allCells = useMemo(() => {
    const cells: Array<{ userId: string; stream: any; isLocal: boolean }> = [];
    participants.forEach(([uid, p]) => {
      if (p.remoteStream) cells.push({ userId: uid, stream: p.remoteStream, isLocal: false });
    });
    if (localStream) cells.push({ userId: 'local', stream: localStream, isLocal: true });
    return cells;
  }, [participants, localStream]);

  const cols = useMemo(() => {
    const count = allCells.length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    return Math.ceil(Math.sqrt(count));
  }, [allCells.length]);

  const cellSize = SCREEN_WIDTH / cols;

  return (
    <View style={gridStyles.container}>
      {allCells.map((cell, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return (
          <View key={cell.userId} style={[gridStyles.cell, { width: cellSize, height: cellSize, left: col * cellSize, top: row * cellSize }]}>
            {cell.stream ? (
              <RTCView streamURL={(cell.stream as any).toURL?.() ?? cell.stream} style={gridStyles.video} objectFit="cover" mirror={cell.isLocal} zOrder={0} />
            ) : (
              <View style={gridStyles.placeholder}>
                <Text style={gridStyles.placeholderText}>{cell.userId.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={gridStyles.label}>
              <Text style={gridStyles.labelText} numberOfLines={1}>{cell.isLocal ? 'Bạn' : cell.userId.slice(0, 8)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ==================== CONTROL ITEM ====================
function ControlItem({ icon, label, active = false, onPress }: {
  icon: React.ReactNode; label: string; active?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={ctrlStyles.wrap}>
      <View style={[ctrlStyles.circle, active && ctrlStyles.active]}>{icon}</View>
      <Text style={ctrlStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const gcStyles = StyleSheet.create({
  ctrlWrap: { alignItems: 'center', minWidth: 52 },
  ctrlCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 3 },
  ctrlActive: { backgroundColor: 'rgba(255,59,48,0.3)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.5)' },
  ctrlLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500', textAlign: 'center' },
  emptyView: { flex: 1, backgroundColor: '#1a1a2e' },
  tileFull: { flex: 1, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  tileVideo: { ...StyleSheet.absoluteFillObject },
  tileAvatarBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d44' },
  tileAvatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)' },
  tileAvatarCircleSmall: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  tileAvatarText: { fontSize: 34, fontWeight: '600', color: 'white' },
  tileAvatarTextSmall: { fontSize: 20, fontWeight: '600', color: 'white' },
  tileLabel: { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileLabelText: { fontSize: 12, fontWeight: '600', color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  tileStatusRow: { flexDirection: 'row', gap: 4 },
  // Split
  splitContainer: { flex: 1, flexDirection: 'row' },
  splitPanel: { flex: 1, backgroundColor: '#2d2d44', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  // Grid
  gridContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  gridTile: { width: '50%', height: '50%', backgroundColor: '#2d2d44', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  // Speaker view
  speakerContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  speakerMain: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  thumbnailScroll: { maxHeight: 100 },
  thumbnailContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  thumbnailCard: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', backgroundColor: '#2d2d44', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  thumbVideo: { flex: 1 },
  thumbAvatarBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d44' },
  thumbAvatarText: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  thumbLabel: { position: 'absolute', bottom: 2, left: 2, right: 2 },
  thumbLabelText: { fontSize: 9, color: 'white', fontWeight: '600', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
  thumbMoreBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(102,126,234,0.7)' },
  thumbMoreText: { fontSize: 18, fontWeight: '700', color: 'white' },
  // Header
  groupHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  groupHeaderSafe: { backgroundColor: 'rgba(0,0,0,0.3)' },
  groupHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  groupHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupHeaderAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  groupHeaderName: { fontSize: 15, fontWeight: '600', color: 'white', maxWidth: 160 },
  groupHeaderCount: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  groupHeaderTimer: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  groupHeaderTimerText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },
  groupHeaderMinBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  // Controls
  groupControlsOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  groupControlsSafe: { paddingBottom: 16 },
  groupControlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 8, marginBottom: 16 },
  groupEndRow: { alignItems: 'center' },
  groupEndBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  // Local PiP
  groupLocalPip: { position: 'absolute', width: 80, height: 110, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', zIndex: 15 },
  groupLocalPipVideo: { flex: 1 },
  groupLocalPipBadge: { position: 'absolute', top: 3, left: 3, backgroundColor: 'rgba(102,126,234,0.9)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  groupLocalPipBadgeText: { fontSize: 9, fontWeight: '700', color: 'white' },
});

const gridStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a2e' },
  cell: { position: 'absolute', overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  video: { flex: 1 },
  placeholder: { flex: 1, backgroundColor: '#2d2d5e', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 36, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  label: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  labelText: { fontSize: 11, color: 'white', fontWeight: '500' },
});

const ctrlStyles = StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 54 },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  active: { backgroundColor: 'rgba(255,59,48,0.3)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.5)' },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  remotePlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d2d5e' },
  videoAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  avatarInitial: { fontSize: 44, fontWeight: '600', color: 'white' },
  pipContainer: { position: 'absolute', width: PIP_WIDTH, height: PIP_HEIGHT, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', zIndex: 10 },
  pipVideo: { flex: 1 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  overlaySafe: { flex: 1, justifyContent: 'space-between' },
  videoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  networkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  networkText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  videoTimer: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },
  topActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  videoCenter: { alignItems: 'center' },
  videoName: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  videoControls: { paddingBottom: 32 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 8, marginBottom: 20 },
  // Voice
  voiceSafe: { flex: 1 },
  voiceTapArea: { flex: 1 },
  voiceTop: { alignItems: 'center', paddingTop: 20 },
  voiceTimer: { fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.65)', fontVariant: ['tabular-nums'] },
  voiceCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  voiceAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  voiceAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  voiceAvatarInitial: { fontSize: 40, fontWeight: '600', color: 'white' },
  voiceName: { fontSize: 24, fontWeight: '700', color: 'white', marginBottom: 4, textAlign: 'center' },
  voiceStatus: { fontSize: 14, color: '#34C759', fontWeight: '400', marginBottom: 12 },
  voiceControlsWrap: { paddingBottom: 32 },
  voiceControlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 12, marginBottom: 24 },
  endCallRow: { alignItems: 'center' },
  endCallBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Phone, PhoneOff, Video, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { playRingtone, stopRingtone } from '@/src/services/callRingtone';
import { useConversationDetailStore, type ConversationMember } from '@/src/store/useConversationDetailStore';

const AVATAR_SIZE = 110;
const GROUP_AVATAR_SIZE = 100;

export function IncomingCallScreen() {
  const { incomingCall, callState } = useCallStore();
  const { acceptCall, rejectCall } = useCallService();
  const router = useRouter();

  const [callerName, setCallerName] = useState('');
  const [callerAvatar, setCallerAvatar] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<Array<{ id: string; initial: string }>>([]);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const isVideoCall = incomingCall?.callType === 'video';
  const isGroupCall = incomingCall?.conversationType === 'group';
  const conversationDetail = useConversationDetailStore((s) =>
    incomingCall?.conversationId ? s.cache[incomingCall.conversationId]?.conversation ?? null : null
  );

  useEffect(() => {
    playRingtone();
    return () => { stopRingtone(); };
  }, []);

  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      stopRingtone();
      router.back();
    } else if (callState === 'connecting' || callState === 'active') {
      stopRingtone();
      router.replace({
        pathname: '/call/active',
        params: { callType: incomingCall?.callType || 'audio' },
      });
    }
  }, [callState, router, incomingCall]);

  useEffect(() => {
    if (!incomingCall) return;
    (async () => {
      try {
        const profile = await getUserProfile(incomingCall.initiatorId);
        if (profile) {
          const name = profile.fullName || profile.nickname || incomingCall.initiatorId;
          setCallerName(name);
          setCallerAvatar(profile.avatarUrl || '');
          useCallStore.getState().setUserDisplayName(incomingCall.initiatorId, name);
        } else {
          setCallerName(incomingCall.initiatorId);
        }
      } catch {
        setCallerName(incomingCall.initiatorId);
      }
    })();
  }, [incomingCall]);

  useEffect(() => {
    if (!incomingCall || !isGroupCall || !incomingCall.conversationId) return;
    if (conversationDetail) {
      setGroupName(conversationDetail.name || '');
      setMemberCount(conversationDetail.memberCount || 0);
    }
    const cId = incomingCall.conversationId;
    const cachedMembers = useConversationDetailStore.getState().getMembers(cId);
    if (cachedMembers.length > 0) {
      const initials = cachedMembers.slice(0, 4).map((m: ConversationMember) => ({
        id: m.userId || m.id,
        initial: ((m.fullName || m.nickname || m.userId || '?')[0] || '?').toUpperCase(),
      }));
      setMembers(initials);
    } else {
      useConversationDetailStore.getState()
        .fetchConversationDetail(cId)
        .then(() => {
          const fetched = useConversationDetailStore.getState().getMembers(cId);
          const initials = fetched.slice(0, 4).map((m: ConversationMember) => ({
            id: m.userId || m.id,
            initial: ((m.fullName || m.nickname || m.userId || '?')[0] || '?').toUpperCase(),
          }));
          setMembers(initials);
        })
        .catch(() => {});
    }
  }, [incomingCall, isGroupCall, conversationDetail]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
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
          toValue: -6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateYAnim]);

  const handleAccept = useCallback(async () => {
    try {
      await acceptCall();
      router.replace({
        pathname: '/call/active',
        params: { callType: incomingCall?.callType || 'audio' },
      });
    } catch {}
  }, [acceptCall, router, incomingCall]);

  const handleReject = useCallback(async () => {
    try {
      await rejectCall('rejected_by_user');
      router.back();
    } catch {}
  }, [rejectCall, router]);

  if (!incomingCall) return null;

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.05],
  });

  const initial = callerName ? callerName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          {/* Call type label */}
          <Text style={styles.callType}>
            {isGroupCall
              ? (isVideoCall ? 'Cuộc gọi video nhóm' : 'Cuộc gọi thoại nhóm')
              : (isVideoCall ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến')}
          </Text>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.glowRing,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            {isGroupCall ? (
              <Animated.View
                style={[
                  styles.groupAvatarWrap,
                  { transform: [{ translateY: translateYAnim }] },
                ]}
              >
                {members.length >= 2 ? (
                  <View style={styles.compositeGrid}>
                    {members.slice(0, 4).map((m, idx) => (
                      <View
                        key={m.id}
                        style={[
                          styles.compositeBlock,
                          idx === 0 && { top: 0, left: 0 },
                          idx === 1 && { top: 0, right: 0 },
                          idx === 2 && { bottom: 0, left: 0 },
                          idx === 3 && { bottom: 0, right: 0 },
                          members.length === 2 && idx <= 1 && {
                            top: '25%',
                            height: '50%',
                          },
                          members.length === 3 && idx === 2 && {
                            left: '25%',
                            width: '50%',
                          },
                        ]}
                      >
                        <Text style={styles.compositeInitial}>{m.initial}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Users size={44} color="rgba(255,255,255,0.8)" />
                )}
              </Animated.View>
            ) : (
              <>
                {callerAvatar ? (
                  <Animated.Image
                    source={{ uri: callerAvatar }}
                    style={[
                      styles.avatar,
                      { transform: [{ scale: pulseScale }] },
                    ]}
                  />
                ) : (
                  <Animated.View
                    style={[
                      styles.avatarPlaceholder,
                      { transform: [{ scale: pulseScale }] },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </Animated.View>
                )}
              </>
            )}
          </View>

          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>
            {isGroupCall ? (groupName || 'Cuộc gọi nhóm') : callerName}
          </Text>

          {/* Caller info for group */}
          {isGroupCall && (
            <Text style={styles.callerInfo}>
              {callerName || 'Đang tải...'} gọi
            </Text>
          )}

          {/* Member count for group */}
          {isGroupCall && memberCount > 0 && (
            <Text style={styles.memberInfo}>
              {memberCount} thành viên
            </Text>
          )}
        </View>

        {/* Bottom buttons */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReject}
            activeOpacity={0.8}
          >
            <View style={styles.rejectCircle}>
              <PhoneOff size={28} color="white" />
            </View>
            <Text style={styles.actionLabel}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <View style={[styles.acceptCircle, isVideoCall && styles.acceptVideoCircle]}>
              {isVideoCall ? (
                <Video size={28} color="white" />
              ) : (
                <Phone size={28} color="white" />
              )}
            </View>
            <Text style={styles.actionLabel}>Chấp nhận</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 48,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  callType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: AVATAR_SIZE + 40,
    height: AVATAR_SIZE + 40,
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 40,
    height: AVATAR_SIZE + 40,
    borderRadius: (AVATAR_SIZE + 40) / 2,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '600',
    color: 'white',
  },
  groupAvatarWrap: {
    width: GROUP_AVATAR_SIZE,
    height: GROUP_AVATAR_SIZE,
    borderRadius: GROUP_AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  compositeGrid: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  compositeBlock: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  compositeInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 6,
  },
  callerInfo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 48,
    alignItems: 'center',
    paddingBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
  },
  acceptCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptVideoCircle: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
  },
  rejectCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
});

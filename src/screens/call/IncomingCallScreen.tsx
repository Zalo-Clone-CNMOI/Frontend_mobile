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
  Dimensions,
} from 'react-native';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { playRingtone, stopRingtone } from '@/src/services/callRingtone';

const AVATAR_SIZE = 120;

export function IncomingCallScreen() {
  const { incomingCall, callState } = useCallStore();
  const { acceptCall, rejectCall } = useCallService();
  const router = useRouter();

  const [callerName, setCallerName] = useState('');
  const [callerAvatar, setCallerAvatar] = useState('');
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isVideoCall = incomingCall?.callType === 'video';

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
          setCallerName(profile.fullName || profile.nickname || incomingCall.initiatorId);
          setCallerAvatar(profile.avatarUrl || '');
        } else {
          setCallerName(incomingCall.initiatorId);
        }
      } catch {
        setCallerName(incomingCall.initiatorId);
      }
    })();
  }, [incomingCall]);

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
    outputRange: [1, 1.04],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0.3],
  });

  const initial = callerName ? callerName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          <Animated.View
            style={[
              styles.glowRing,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          {callerAvatar ? (
            <Image source={{ uri: callerAvatar }} style={styles.avatar} />
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
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callType}>
            {isVideoCall ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
          </Text>
        </View>

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
            <View style={styles.acceptCircle}>
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
  },
  glowRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 40,
    height: AVATAR_SIZE + 40,
    borderRadius: (AVATAR_SIZE + 40) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 20,
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: '600',
    color: 'white',
  },
  callerName: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  callType: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
  },
  acceptCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  rejectCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
});

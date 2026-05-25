import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Phone, Video } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { EndCallButton } from '@/src/components/call/EndCallButton';
import { playCallingTone, stopRingtone } from '@/src/services/callRingtone';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 110;
const RING_SIZE = 200;

interface CallingScreenProps {
  callType?: 'audio' | 'video';
}

export function CallingScreen({ callType = 'audio' }: CallingScreenProps) {
  const { callState, currentCall } = useCallStore();
  const { endCall } = useCallService();
  const router = useRouter();

  const [recipientName, setRecipientName] = useState('');
  const [recipientAvatar, setRecipientAvatar] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isVideoCall = callType === 'video';
  const initial = recipientName ? recipientName.charAt(0).toUpperCase() : '?';

  useEffect(() => {
    playCallingTone();
    return () => { stopRingtone(); };
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
    const fetchRecipient = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) return;
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setRecipientName(profile.fullName || profile.nickname || '');
          setRecipientAvatar(profile.avatarUrl || '');
        }
      } catch {
        setRecipientName('');
      }
    };
    fetchRecipient();
  }, [currentCall]);

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
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  useEffect(() => {
    if (callState === 'active') {
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

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });
  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const statusText =
    callState === 'calling'
      ? isVideoCall
        ? 'Đang gọi video...'
        : 'Đang gọi...'
      : 'Đang kết nối...';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerSection}>
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.ringOuter,
                {
                  transform: [{ scale: pulseScale }, { rotate: spinRotation }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ringInner,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            {recipientAvatar ? (
              <Image source={{ uri: recipientAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {recipientName || 'Đang gọi...'}
          </Text>

          <View style={styles.statusRow}>
            {isVideoCall ? (
              <Video size={14} color="rgba(255,255,255,0.5)" />
            ) : (
              <Phone size={14} color="rgba(255,255,255,0.5)" />
            )}
            <Text style={styles.status}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <EndCallButton onPress={handleEndCall} />
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
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 28,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(52,199,89,0.5)',
  },
  ringInner: {
    position: 'absolute',
    width: RING_SIZE - 24,
    height: RING_SIZE - 24,
    borderRadius: (RING_SIZE - 24) / 2,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  status: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  bottomSection: {
    alignItems: 'center',
  },
});

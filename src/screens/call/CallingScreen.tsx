import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { Phone, Video, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '@/src/store/useCallStore';
import { useCallService } from '@/src/services/callService';
import { getUserProfile } from '@/src/services/usersApi';
import { useRouter } from 'expo-router';
import { EndCallButton } from '@/src/components/call/EndCallButton';
import { playCallingTone, stopRingtone } from '@/src/services/callRingtone';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';

const AVATAR_SIZE = 110;
const GROUP_AVATAR_SIZE = 100;
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
  const [groupCallName, setGroupCallName] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isVideoCall = callType === 'video';
  const isGroupCall = currentCall?.conversationType === 'group';
  const initial = recipientName ? recipientName.charAt(0).toUpperCase() : '?';
  const conversationId = currentCall?.conversationId;
  const conversationDetail = useConversationDetailStore((s) =>
    conversationId ? s.cache[conversationId]?.conversation ?? null : null
  );

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
    if (isGroupCall) {
      if (conversationDetail) {
        setGroupCallName(conversationDetail.name || '');
      } else if (conversationId) {
        useConversationDetailStore.getState()
          .fetchConversationDetail(conversationId)
          .then(() => {
            const conv = useConversationDetailStore.getState().getConversationDetail(conversationId);
            if (conv) setGroupCallName(conv.name || '');
          })
          .catch(() => {});
      }
      return;
    }
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

  const displayName = isGroupCall ? (groupCallName || 'Cuộc gọi nhóm') : (recipientName || 'Đang gọi...');

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
          {isGroupCall ? (
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
              <View style={styles.groupAvatarWrap}>
                <Users size={44} color="white" />
              </View>
            </View>
          ) : (
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
          )}

          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.statusRow}>
            {isVideoCall ? (
              <Video size={14} color="rgba(255,255,255,0.5)" />
            ) : (
              <Phone size={14} color="rgba(255,255,255,0.5)" />
            )}
            <Text style={styles.status}>
              {isGroupCall
                ? (isVideoCall ? 'Cuộc gọi video nhóm' : 'Cuộc gọi thoại nhóm')
                : statusText}
            </Text>
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
  groupAvatarWrap: {
    width: GROUP_AVATAR_SIZE,
    height: GROUP_AVATAR_SIZE,
    borderRadius: GROUP_AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
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

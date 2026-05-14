import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
} from "react-native";
import { PhoneOff } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallStore } from "@/src/store/useCallStore";
import { useCallService } from "@/src/services/callService";
import { getUserProfile } from "@/src/services/usersApi";
import { useRouter } from "expo-router";

export function CallingScreen() {
  const { callState, currentCall } = useCallStore();
  const { endCall } = useCallService();
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("Đang gọi...");
  const [recipientAvatar, setRecipientAvatar] = useState("");
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (callState === "ended" || callState === "idle") {
      router.back();
    }
  }, [callState, router]);

  useEffect(() => {
    const fetchRecipient = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) {
        setRecipientName("Đang gọi...");
        return;
      }
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setRecipientName(profile.fullName || profile.nickname || "Người dùng");
          setRecipientAvatar(profile.avatarUrl || "");
        }
      } catch {
        setRecipientName("Người dùng");
      }
    };
    fetchRecipient();
  }, [currentCall]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (callState === "active") {
      router.replace("/call/active");
    }
  }, [callState, router]);

  const handleEndCall = async () => {
    try {
      await endCall();
      router.back();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  const initial = recipientName ? recipientName.charAt(0).toUpperCase() : "?";

  return (
    <View style={[styles.container, { backgroundColor: '#1a1a2e' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerSection}>
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            {recipientAvatar ? (
              <Image source={{ uri: recipientAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.recipientName}>{recipientName}</Text>
          <Text style={styles.statusText}>
            {callState === "calling" ? "Đang gọi..." : "Đang kết nối..."}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity onPress={handleEndCall} activeOpacity={0.7}>
            <View style={styles.endCallButton}>
              <PhoneOff size={32} color="white" />
            </View>
            <Text style={styles.endLabel}>Kết thúc</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 60,
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#2d2d5e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontSize: 44,
    fontWeight: "bold",
    color: "white",
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  recipientName: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },
  bottomSection: {
    alignItems: "center",
  },
  endCallButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  endLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});

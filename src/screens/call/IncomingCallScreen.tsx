import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { Phone, PhoneOff } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/themeContext";
import { useCallStore } from "@/src/store/useCallStore";
import { useCallService } from "@/src/services/callService";
import { getUserProfile } from "@/src/services/usersApi";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export function IncomingCallScreen() {
  const { incomingCall, callState } = useCallStore();
  const { acceptCall, rejectCall } = useCallService();
  const theme = useTheme();
  const router = useRouter();
  const [callerName, setCallerName] = useState<string>("");
  const [callerAvatar, setCallerAvatar] = useState<string>("");
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (callState === "ended" || callState === "idle") {
      router.back();
    } else if (callState === "connecting" || callState === "active") {
      router.replace("/call/active");
    }
  }, [callState, router]);

  useEffect(() => {
    if (!incomingCall) return;
    const fetchCallerProfile = async () => {
      try {
        const profile = await getUserProfile(incomingCall.initiatorId);
        if (profile) {
          setCallerName(profile.fullName || profile.nickname || incomingCall.initiatorId);
          setCallerAvatar(profile.avatarUrl || "");
        } else {
          setCallerName(incomingCall.initiatorId);
        }
      } catch {
        setCallerName(incomingCall.initiatorId);
      }
    };
    fetchCallerProfile();
  }, [incomingCall]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  if (!incomingCall) return null;

  const handleAccept = async () => {
    try {
      await acceptCall();
      router.push("/call/active");
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectCall("rejected_by_user");
      router.back();
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const initial = callerName ? callerName.charAt(0).toUpperCase() : "?";

  return (
    <View style={[styles.container, { backgroundColor: '#1a1a2e' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          {callerAvatar ? (
            <Image source={{ uri: callerAvatar }} style={styles.avatar} />
          ) : (
            <Animated.View
              style={[styles.avatarCircle, { transform: [{ scale: pulseScale }] }]}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </Animated.View>
          )}
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callType}>
            {incomingCall.callType === "video" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            activeOpacity={0.7}
          >
            <View style={styles.rejectCircle}>
              <PhoneOff size={28} color="white" />
            </View>
            <Text style={styles.buttonLabel}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <View style={styles.acceptCircle}>
              <Phone size={28} color="white" />
            </View>
            <Text style={styles.buttonLabel}>Chấp nhận</Text>
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
    paddingBottom: 50,
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2d2d5e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
  },
  callerName: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  callType: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 60,
  },
  acceptButton: {
    alignItems: "center",
  },
  rejectButton: {
    alignItems: "center",
  },
  acceptCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  rejectCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  buttonLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },
});

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Users,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallStore } from "@/src/store/useCallStore";
import { useCallService } from "@/src/services/callService";
import { getUserProfile } from "@/src/services/usersApi";
import { useRouter } from "expo-router";

export function ActiveCallScreen() {
  const { currentCall, isAudioEnabled, getCallDuration, callState } = useCallStore();
  const { endCall, toggleCallAudio } = useCallService();
  const router = useRouter();
  const [duration, setDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [participantName, setParticipantName] = useState("Đang gọi...");
  const [participantAvatar, setParticipantAvatar] = useState("");

  useEffect(() => {
    if (callState === "ended" || callState === "idle") {
      router.back();
    }
  }, [callState, router]);

  useEffect(() => {
    const fetchRecipient = async () => {
      const userId = currentCall?.remoteUserId;
      if (!userId) {
        setParticipantName("Đang gọi...");
        return;
      }
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setParticipantName(profile.fullName || profile.nickname || "Người dùng");
          setParticipantAvatar(profile.avatarUrl || "");
        }
      } catch {
        setParticipantName("Người dùng");
      }
    };
    fetchRecipient();
  }, [currentCall]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor(getCallDuration() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    toggleCallAudio(newState);
  };

  const handleToggleSpeaker = () => {
    setSpeakerEnabled(!speakerEnabled);
  };

  const handleEndCall = async () => {
    try {
      await endCall();
      router.back();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#1a1a2e' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        </View>

        <View style={styles.centerSection}>
          {participantAvatar ? (
            <Image source={{ uri: participantAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {participantName ? participantName.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{participantName}</Text>
          <Text style={styles.status}>Đang nói chuyện</Text>
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleAudio} activeOpacity={0.7}>
            <View style={[styles.controlCircle, !audioEnabled && styles.controlActive]}>
              {audioEnabled ? <Mic size={26} color="white" /> : <MicOff size={26} color="white" />}
            </View>
            <Text style={styles.controlLabel}>Tắt mic</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleToggleSpeaker} activeOpacity={0.7}>
            <View style={[styles.controlCircle, speakerEnabled && styles.controlActive]}>
              <Volume2 size={26} color="white" />
            </View>
            <Text style={styles.controlLabel}>Loa ngoài</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} activeOpacity={0.7}>
            <View style={styles.controlCircle}>
              <Users size={26} color="white" />
            </View>
            <Text style={styles.controlLabel}>Thêm</Text>
          </TouchableOpacity>
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
    paddingBottom: 50,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
  },
  duration: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    fontVariant: ['tabular-nums'],
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2d2d5e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
  },
  status: {
    fontSize: 14,
    color: "#4CAF50",
  },
  controlsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  controlButton: {
    alignItems: "center",
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  controlActive: {
    backgroundColor: "#4CAF50",
  },
  controlLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
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

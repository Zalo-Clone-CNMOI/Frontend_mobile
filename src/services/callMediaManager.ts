import { useCallStore } from "../store/useCallStore";
import { Audio } from "expo-av";
import { Platform, PermissionsAndroid } from "react-native";
import { toast } from "./toastService";

/**
 * Call Media Manager
 * Manages microphone, speaker, and audio routing
 * Handles permissions and audio stream setup
 */

interface AudioPermissionStatus {
  microphone: boolean;
  audioSettings: boolean;
}

class CallMediaManager {
  private audioSession: Audio.Recording | null = null;
  private audioInitialized = false;

  /**
   * Check and request necessary audio permissions
   */
  async requestAudioPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "android") {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = permissions.every(
          (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          toast.error("Audio permissions denied");
          return false;
        }
      } else if (Platform.OS === "ios") {
        // iOS permissions are configured in app.json infoPlist
        // Runtime request happens automatically when accessing microphone
      }

      return true;
    } catch (error) {
      console.error("[CallMediaManager] Error requesting permissions", error);
      toast.error("Failed to request audio permissions");
      return false;
    }
  }

  /**
   * Initialize audio session for call
   * Must be called before attempting to capture audio
   */
  async initializeAudioSession(): Promise<void> {
    if (this.audioInitialized) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: true, // Important for calls
      });

      this.audioInitialized = true;
      console.log("[CallMediaManager] Audio session initialized");
    } catch (error) {
      console.error("[CallMediaManager] Error initializing audio", error);
      toast.error("Failed to initialize audio");
      throw error;
    }
  }

  /**
   * Set audio output to speaker
   * Call this to route audio to speaker instead of receiver
   */
  async setSpeakerOutput(enabled: boolean): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !enabled, // false = speaker, true = earpiece
        staysActiveInBackground: true,
      });

      console.log(
        `[CallMediaManager] Speaker output ${enabled ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("[CallMediaManager] Error setting speaker output", error);
      throw error;
    }
  }

  /**
   * Enable speaker for conference/group calls
   */
  async enableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(true);
  }

  /**
   * Use earpiece/receiver for direct calls
   */
  async disableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(false);
  }

  /**
   * Create local audio stream for microphone
   * Returns MediaStream with audio track
   */
  async createLocalAudioStream(): Promise<MediaStream> {
    try {
      // Check permissions first
      const hasPermission = await this.requestAudioPermissions();
      if (!hasPermission) {
        throw new Error("Audio permissions not granted");
      }

      // Initialize audio session
      await this.initializeAudioSession();

      // Create WebRTC audio constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      // Get user media (microphone access)
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store reference for later cleanup
      this.audioSession = null; // In expo-av, we don't store the stream same way

      // Enable local audio in store
      const { setLocalStream } = useCallStore.getState();
      setLocalStream(stream);

      console.log("[CallMediaManager] Local audio stream created");
      return stream;
    } catch (error) {
      console.error("[CallMediaManager] Error creating local audio stream", error);
      toast.error("Failed to access microphone");
      throw error;
    }
  }

  /**
   * Create local audio/video stream
   * For video calls (audio + video tracks)
   */
  async createLocalMediaStream(videoEnabled: boolean = false): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: videoEnabled
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const { setLocalStream } = useCallStore.getState();
      setLocalStream(stream);

      console.log(
        `[CallMediaManager] Local media stream created with video=${videoEnabled}`
      );
      return stream;
    } catch (error) {
      console.error("[CallMediaManager] Error creating media stream", error);
      toast.error("Failed to access media devices");
      throw error;
    }
  }

  /**
   * Stop all local audio/video tracks
   */
  async stopLocalMedia(): Promise<void> {
    try {
      const { localStream, setLocalStream } = useCallStore.getState();

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });

        setLocalStream(null);
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: Audio.InterruptionModeIOS.Default,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.Default,
        shouldDuckAndroid: false,
      });

      this.audioInitialized = false;
      console.log("[CallMediaManager] Local media stopped");
    } catch (error) {
      console.error("[CallMediaManager] Error stopping media", error);
    }
  }

  /**
   * Mute microphone by disabling audio track
   */
  async muteAudio(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    console.log("[CallMediaManager] Microphone muted");
  }

  /**
   * Unmute microphone by enabling audio track
   */
  async unmuteAudio(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    console.log("[CallMediaManager] Microphone unmuted");
  }

  /**
   * Disable video tracks
   */
  async disableVideo(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    console.log("[CallMediaManager] Video disabled");
  }

  /**
   * Enable video tracks
   */
  async enableVideo(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    console.log("[CallMediaManager] Video enabled");
  }

  /**
   * Get audio level from local stream
   * Useful for displaying audio visualization
   */
  getAudioLevel(): number {
    // This is a simplified implementation
    // In production, you would use Web Audio API to analyze actual audio levels
    return Math.random(); // Placeholder
  }

  /**
   * Clean up all media resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopLocalMedia();
      console.log("[CallMediaManager] Resources cleaned up");
    } catch (error) {
      console.error("[CallMediaManager] Error during cleanup", error);
    }
  }

  /**
   * Request microphone access for first time
   * Call this when user grants permission in settings
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      return false;
    } catch (error) {
      console.error("[CallMediaManager] Microphone access denied", error);
      return false;
    }
  }
}

export const callMediaManager = new CallMediaManager();

// React hook
export function useCallMediaManager() {
  return {
    requestAudioPermissions: callMediaManager.requestAudioPermissions.bind(
      callMediaManager
    ),
    initializeAudioSession: callMediaManager.initializeAudioSession.bind(
      callMediaManager
    ),
    createLocalAudioStream: callMediaManager.createLocalAudioStream.bind(
      callMediaManager
    ),
    createLocalMediaStream: callMediaManager.createLocalMediaStream.bind(
      callMediaManager
    ),
    stopLocalMedia: callMediaManager.stopLocalMedia.bind(callMediaManager),
    muteAudio: callMediaManager.muteAudio.bind(callMediaManager),
    unmuteAudio: callMediaManager.unmuteAudio.bind(callMediaManager),
    disableVideo: callMediaManager.disableVideo.bind(callMediaManager),
    enableVideo: callMediaManager.enableVideo.bind(callMediaManager),
    enableSpeaker: callMediaManager.enableSpeaker.bind(callMediaManager),
    disableSpeaker: callMediaManager.disableSpeaker.bind(callMediaManager),
    getAudioLevel: callMediaManager.getAudioLevel.bind(callMediaManager),
    cleanup: callMediaManager.cleanup.bind(callMediaManager),
  };
}

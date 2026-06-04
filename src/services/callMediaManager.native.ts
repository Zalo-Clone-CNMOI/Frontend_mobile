import { useCallStore } from "../store/useCallStore";
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { Platform, PermissionsAndroid } from "react-native";
import { toast } from "./toastService";
import { isWebRTCAvailable, loadWebRTC } from "../utils/webrtcLoader";

let mediaDevicesCache: any = null;

const WEBRTC_UNAVAILABLE_MSG =
  "Calls require a custom dev build (expo run:android / EAS). WebRTC is not available in Expo Go.";

async function getMediaDevices() {
  if (!isWebRTCAvailable()) {
    throw new Error(WEBRTC_UNAVAILABLE_MSG);
  }

  if (mediaDevicesCache) {
    return mediaDevicesCache;
  }

  const mod = await loadWebRTC();
  if (!mod?.mediaDevices?.getUserMedia) {
    throw new Error(WEBRTC_UNAVAILABLE_MSG);
  }

  mediaDevicesCache = mod.mediaDevices;
  return mediaDevicesCache;
}

class CallMediaManager {
  private audioInitialized = false;
  private currentFacingMode: "user" | "environment" = "user";

  async requestAudioPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "android") {
        const recordGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );

        if (recordGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          toast.error("Microphone permission denied");
          return false;
        }
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          toast.error("Microphone permission denied");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("[CallMediaManager] Error requesting permissions", error);
      toast.error("Failed to request audio permissions");
      return false;
    }
  }

  async requestCameraPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          toast.error("Camera permission denied");
          return false;
        }
      } else {
        const { granted } = await Camera.requestCameraPermissionsAsync();
        if (!granted) {
          toast.error("Camera permission denied");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("[CallMediaManager] Error requesting camera permissions", error);
      toast.error("Failed to request camera permissions");
      return false;
    }
  }

  async initializeAudioSession(): Promise<void> {
    if (this.audioInitialized) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: true,
      });

      this.audioInitialized = true;
      console.log("[CallMediaManager] Audio session initialized");
    } catch (error) {
      console.error("[CallMediaManager] Error initializing audio", error);
      toast.error("Failed to initialize audio");
      throw error;
    }
  }

  async setSpeakerOutput(enabled: boolean): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !enabled,
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

  async enableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(true);
  }

  async disableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(false);
  }

  async createLocalAudioStream(): Promise<any> {
    try {
      const hasPermission = await this.requestAudioPermissions();
      if (!hasPermission) {
        throw new Error("Audio permissions not granted");
      }

      await this.initializeAudioSession();

      const md = await getMediaDevices()
      const stream = await md.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const { setLocalStream } = useCallStore.getState();
      setLocalStream(stream as any);

      console.log("[CallMediaManager] Local audio stream created");
      return stream;
    } catch (error) {
      console.error("[CallMediaManager] Error creating local audio stream", error);
      toast.error("Failed to access microphone");
      throw error;
    }
  }

  async createLocalMediaStream(videoEnabled: boolean = false): Promise<any> {
    try {
      const hasAudio = await this.requestAudioPermissions();
      if (!hasAudio) {
        throw new Error("Audio permissions not granted");
      }

      if (videoEnabled) {
        const hasCamera = await this.requestCameraPermissions();
        if (!hasCamera) {
          throw new Error("Camera permissions not granted");
        }
      }

      await this.initializeAudioSession();

      const md = await getMediaDevices()
      const stream = await md.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: videoEnabled
          ? {
              width: 1280,
              height: 720,
              frameRate: 30,
              facingMode: this.currentFacingMode,
            }
          : false,
      });

      const { setLocalStream } = useCallStore.getState();
      setLocalStream(stream as any);

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

  async switchCamera(): Promise<void> {
    const { localStream } = useCallStore.getState();
    if (!localStream) return;

    const stream = localStream as any;
    const videoTrack = stream.getVideoTracks?.()[0];
    if (!videoTrack) return;

    this.currentFacingMode =
      this.currentFacingMode === "user" ? "environment" : "user";

    try {
      const md = await getMediaDevices()
      const newStream = await md.getUserMedia({
        audio: false,
        video: {
          facingMode: this.currentFacingMode,
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      });

      const newVideoTrack = newStream.getVideoTracks()?.[0];
      if (newVideoTrack) {
        stream.removeTrack(videoTrack);
        videoTrack.stop();
        stream.addTrack(newVideoTrack);

        const { callPeerManager: cpm } = require('./callPeerManager') as any;
        cpm.replaceAllVideoTracks(newVideoTrack);
      }

      newStream.getTracks().forEach((t: any) => {
        if (t.kind !== "video") {
          t.stop();
        }
      });

      console.log(
        `[CallMediaManager] Camera switched to ${this.currentFacingMode}`
      );
    } catch (error) {
      console.error("[CallMediaManager] Error switching camera", error);
      toast.error("Failed to switch camera");
    }
  }

  async stopLocalMedia(): Promise<void> {
    try {
      const { localStream, setLocalStream } = useCallStore.getState();

      if (localStream) {
        const stream = localStream as any;
        if (stream.getTracks) {
          stream.getTracks().forEach((track: any) => {
            if (track.stop) track.stop();
          });
        }

        setLocalStream(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
      });

      this.audioInitialized = false;
      console.log("[CallMediaManager] Local media stopped");
    } catch (error) {
      console.error("[CallMediaManager] Error stopping media", error);
    }
  }

  async muteAudio(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      const stream = localStream as any;
      if (stream.getAudioTracks) {
        stream.getAudioTracks().forEach((track: any) => {
          track.enabled = false;
        });
      }
    }

    console.log("[CallMediaManager] Microphone muted");
  }

  async unmuteAudio(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      const stream = localStream as any;
      if (stream.getAudioTracks) {
        stream.getAudioTracks().forEach((track: any) => {
          track.enabled = true;
        });
      }
    }

    console.log("[CallMediaManager] Microphone unmuted");
  }

  async disableVideo(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      const stream = localStream as any;
      if (stream.getVideoTracks) {
        stream.getVideoTracks().forEach((track: any) => {
          track.enabled = false;
        });
      }
    }

    console.log("[CallMediaManager] Video disabled");
  }

  async enableVideo(): Promise<void> {
    const { localStream } = useCallStore.getState();

    if (localStream) {
      const stream = localStream as any;
      if (stream.getVideoTracks) {
        stream.getVideoTracks().forEach((track: any) => {
          track.enabled = true;
        });
      }
    }

    console.log("[CallMediaManager] Video enabled");
  }

  getAudioLevel(): number {
    return Math.random();
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopLocalMedia();
      console.log("[CallMediaManager] Resources cleaned up");
    } catch (error) {
      console.error("[CallMediaManager] Error during cleanup", error);
    }
  }

  async requestMicrophoneAccess(): Promise<boolean> {
    try {
      const md = await getMediaDevices()
      const stream = await md.getUserMedia({
        audio: true,
      });

      if (stream) {
        (stream as any).getTracks().forEach((track: any) => track.stop());
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

export function useCallMediaManager() {
  return {
    requestAudioPermissions: callMediaManager.requestAudioPermissions.bind(callMediaManager),
    requestCameraPermissions: callMediaManager.requestCameraPermissions.bind(callMediaManager),
    initializeAudioSession: callMediaManager.initializeAudioSession.bind(callMediaManager),
    createLocalAudioStream: callMediaManager.createLocalAudioStream.bind(callMediaManager),
    createLocalMediaStream: callMediaManager.createLocalMediaStream.bind(callMediaManager),
    stopLocalMedia: callMediaManager.stopLocalMedia.bind(callMediaManager),
    muteAudio: callMediaManager.muteAudio.bind(callMediaManager),
    unmuteAudio: callMediaManager.unmuteAudio.bind(callMediaManager),
    disableVideo: callMediaManager.disableVideo.bind(callMediaManager),
    enableVideo: callMediaManager.enableVideo.bind(callMediaManager),
    switchCamera: callMediaManager.switchCamera.bind(callMediaManager),
    enableSpeaker: callMediaManager.enableSpeaker.bind(callMediaManager),
    disableSpeaker: callMediaManager.disableSpeaker.bind(callMediaManager),
    getAudioLevel: callMediaManager.getAudioLevel.bind(callMediaManager),
    cleanup: callMediaManager.cleanup.bind(callMediaManager),
  };
}

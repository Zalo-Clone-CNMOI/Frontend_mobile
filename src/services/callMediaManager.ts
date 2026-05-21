import { Audio } from "expo-av";
import { toast } from "./toastService";

class CallMediaManager {
  private audioInitialized = false;
  private currentFacingMode: "user" | "environment" = "user";

  async requestAudioPermissions(): Promise<boolean> {
    return true;
  }

  async requestCameraPermissions(): Promise<boolean> {
    return true;
  }

  async initializeAudioSession(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: true,
      });
      this.audioInitialized = true;
    } catch (error) {
      console.warn("[CallMediaManager] Audio init failed on web", error);
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
    } catch (error) {
      console.warn("[CallMediaManager] Speaker control not available on web", error);
    }
  }

  async enableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(true);
  }

  async disableSpeaker(): Promise<void> {
    await this.setSpeakerOutput(false);
  }

  async createLocalAudioStream(): Promise<any> {
    console.warn("[CallMediaManager] WebRTC media not available on web - using mock stream");
    return null;
  }

  async createLocalMediaStream(_videoEnabled: boolean = false): Promise<any> {
    console.warn("[CallMediaManager] WebRTC media not available on web - using mock stream");
    return null;
  }

  async switchCamera(): Promise<void> {
    console.warn("[CallMediaManager] Camera switch not available on web");
  }

  async stopLocalMedia(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
      });
    } catch (_) {}
    this.audioInitialized = false;
  }

  async muteAudio(): Promise<void> {
    console.warn("[CallMediaManager] Audio mute not available on web");
  }

  async unmuteAudio(): Promise<void> {
    console.warn("[CallMediaManager] Audio unmute not available on web");
  }

  async disableVideo(): Promise<void> {
    console.warn("[CallMediaManager] Video control not available on web");
  }

  async enableVideo(): Promise<void> {
    console.warn("[CallMediaManager] Video control not available on web");
  }

  getAudioLevel(): number {
    return Math.random();
  }

  async cleanup(): Promise<void> {
    await this.stopLocalMedia();
  }

  async requestMicrophoneAccess(): Promise<boolean> {
    return true;
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

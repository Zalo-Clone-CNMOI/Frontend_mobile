import Constants from 'expo-constants';
import type { ComponentType } from 'react';
import { NativeModules } from 'react-native';

type WebRTCModule = typeof import('react-native-webrtc');

let cachedModule: WebRTCModule | null = null;
let loadPromise: Promise<WebRTCModule | null> | null = null;

/**
 * WebRTC native code is not available in Expo Go.
 * Importing react-native-webrtc when WebRTCModule is null crashes at module load
 * (RTCRtpCapabilities calls senderGetCapabilities on null).
 */
export function isWebRTCAvailable(): boolean {
  if (Constants.executionEnvironment === 'storeClient') {
    return false;
  }
  return Boolean(NativeModules.WebRTCModule);
}

export async function loadWebRTC(): Promise<WebRTCModule | null> {
  if (!isWebRTCAvailable()) {
    return null;
  }

  if (cachedModule) {
    return cachedModule;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const mod = await import('react-native-webrtc');
        if (!mod?.mediaDevices || typeof mod.mediaDevices.getUserMedia !== 'function') {
          console.warn('[WebRTC] JS module loaded but mediaDevices is unavailable');
          return null;
        }
        cachedModule = mod;
        return mod;
      } catch (error) {
        console.warn('[WebRTC] Failed to load module:', error);
        return null;
      } finally {
        loadPromise = null;
      }
    })();
  }

  return loadPromise;
}

export async function loadRTCView(): Promise<ComponentType<any> | null> {
  const mod = await loadWebRTC();
  return mod?.RTCView ?? null;
}

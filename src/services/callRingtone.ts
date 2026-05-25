/**
 * Ringtone service for incoming/outgoing calls.
 * Generates a simple WAV beep programmatically — no external audio file needed.
 */

function generateBeepWav(
  frequency: number,
  durationMs: number,
  sampleRate = 8000,
): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.5;
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.floor(value * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

let ringtoneSound: any = null;

export async function playRingtone(): Promise<void> {
  try {
    const { Audio } = require('expo-av');
    const { Sound } = Audio;

    if (ringtoneSound) {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
      ringtoneSound = null;
    }

    const { sound } = await Sound.createAsync(
      { uri: generateBeepWav(440, 2000) },
      { isLooping: true, volume: 0.5 },
    );
    ringtoneSound = sound;
    await sound.playAsync();
  } catch (error) {
    console.warn('[Ringtone] Failed to play ringtone:', error);
  }
}

export async function playCallingTone(): Promise<void> {
  try {
    const { Audio } = require('expo-av');
    const { Sound } = Audio;

    if (ringtoneSound) {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
      ringtoneSound = null;
    }

    const { sound } = await Sound.createAsync(
      { uri: generateBeepWav(350, 1500) },
      { isLooping: true, volume: 0.3 },
    );
    ringtoneSound = sound;
    await sound.playAsync();
  } catch (error) {
    console.warn('[Ringtone] Failed to play calling tone:', error);
  }
}

export async function stopRingtone(): Promise<void> {
  try {
    if (ringtoneSound) {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
      ringtoneSound = null;
    }
  } catch (error) {
    console.warn('[Ringtone] Failed to stop ringtone:', error);
  }
}

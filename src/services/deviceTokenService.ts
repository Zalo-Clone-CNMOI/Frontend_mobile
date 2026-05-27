import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { registerDeviceToken } from './deviceTokensApi';

const STORAGE_KEYS = {
  LAST_TOKEN: 'push:lastToken',
  PENDING_TOKEN: 'push:pendingToken',
};

export interface DeviceTokenInfo {
  id: string;
  token: string;
  platform: string;
  deviceId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Register device token to API and sync to AsyncStorage
 */
export const registerAndSyncToken = async (token: string): Promise<void> => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  
  try {
    await registerDeviceToken({ token, platform });
    
    // Sync to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN, token);
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_TOKEN);
  } catch (error) {
    // Store as pending token to retry later
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_TOKEN, token);
    throw error;
  }
};

/**
 * Clear device token from AsyncStorage (used on logout)
 */
export const clearDeviceToken = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LAST_TOKEN,
      STORAGE_KEYS.PENDING_TOKEN,
    ]);
  } catch (error) {
  }
};

/**
 * Get pending token (token that failed to register)
 */
export const getPendingToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.PENDING_TOKEN);
  } catch (error) {
    return null;
  }
};

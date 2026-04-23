import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDeviceTokens, registerDeviceToken } from './deviceTokensApi';

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
 * Get current device token with fallback strategy
 * Priority: API → AsyncStorage
 */
export const getDeviceToken = async (): Promise<string | null> => {
  try {
    // Try to get from API first
    const apiTokens = await getDeviceTokens();
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    
    // Find active token for current platform
    const activeToken = apiTokens.find(
      (t: DeviceTokenInfo) => t.platform === platform && t.isActive
    );
    
    if (activeToken?.token) {
      // Sync to AsyncStorage for fallback
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN, activeToken.token);
      return activeToken.token;
    }
    
  } catch (apiError) {
  }
  
  // Fallback to AsyncStorage
  try {
    const lastToken = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN);
    if (lastToken) {
      return lastToken;
    }
  } catch (storageError) {
  }
  
  return null;
};

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

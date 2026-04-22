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
      console.log('[deviceTokenService] Got token from API:', activeToken.token.substring(0, 20) + '...');
      // Sync to AsyncStorage for fallback
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN, activeToken.token);
      return activeToken.token;
    }
    
    console.warn('[deviceTokenService] No active token found in API');
  } catch (apiError) {
    console.warn('[deviceTokenService] API failed, falling back to AsyncStorage:', apiError);
  }
  
  // Fallback to AsyncStorage
  try {
    const lastToken = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN);
    if (lastToken) {
      console.log('[deviceTokenService] Got token from AsyncStorage:', lastToken.substring(0, 20) + '...');
      return lastToken;
    }
  } catch (storageError) {
    console.error('[deviceTokenService] Failed to read from AsyncStorage:', storageError);
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
    console.log('[deviceTokenService] Token registered to API successfully');
    
    // Sync to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN, token);
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_TOKEN);
  } catch (error) {
    console.error('[deviceTokenService] Failed to register token:', error);
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
    console.log('[deviceTokenService] Device tokens cleared from AsyncStorage');
  } catch (error) {
    console.error('[deviceTokenService] Failed to clear device tokens:', error);
  }
};

/**
 * Get pending token (token that failed to register)
 */
export const getPendingToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.PENDING_TOKEN);
  } catch (error) {
    console.error('[deviceTokenService] Failed to get pending token:', error);
    return null;
  }
};

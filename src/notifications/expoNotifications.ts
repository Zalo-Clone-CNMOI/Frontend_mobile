import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExpoNotificationsModule = typeof import('expo-notifications');

export const isExpoGo = Constants.appOwnership === 'expo';
export const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';

let notificationsModule: ExpoNotificationsModule | null | undefined;

export function getExpoNotifications(): ExpoNotificationsModule | null {
  if (isExpoGoAndroid) {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = require('expo-notifications');
  } catch (error) {
    console.warn('[Notifications] expo-notifications is unavailable:', error);
    notificationsModule = null;
  }

  return notificationsModule ?? null;
}

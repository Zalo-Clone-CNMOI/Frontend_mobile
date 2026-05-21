import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getExpoNotifications } from './expoNotifications';

function getProjectId(): string | undefined {
  const envProjectId = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();
  if (envProjectId) return envProjectId;

  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig as any)?.extra?.eas?.projectId
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = getExpoNotifications();
  if (!Notifications) return null;

  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      showBadge: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = getProjectId();
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}


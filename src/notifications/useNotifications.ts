import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { registerForPushNotifications } from './registerForPushNotifications';
import { registerDeviceToken } from '../services/deviceTokensApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }
    if (registeredRef.current) return;

    (async () => {
      try {
        // Expo Go (SDK 53+) does NOT support Android remote push via expo-notifications.
        // Skip registration to avoid timeouts/errors; use a development build for real push.
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
          console.warn(
            'Push token registration skipped: Expo Go on Android does not support remote push. Use a development build.',
          );
          return;
        }

        const token = await registerForPushNotifications();
        if (!token) return;

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        // Avoid re-sending same token every cold start
        const lastToken = (await AsyncStorage.getItem('push:lastToken')) || '';
        const pendingToken = (await AsyncStorage.getItem('push:pendingToken')) || '';
        const tokenToSend = pendingToken || token;
        if (tokenToSend === lastToken) {
          registeredRef.current = true;
          console.log('Push token already registered (cached)');
          return;
        }

        await registerDeviceToken({ token: tokenToSend, platform });
        await AsyncStorage.setItem('push:lastToken', tokenToSend);
        await AsyncStorage.removeItem('push:pendingToken');
        registeredRef.current = true;
        console.log('Push token registered');
      } catch (e) {
        const err: any = e;
        try {
          // Queue for retry next time (backend may be temporarily unreachable)
          const lastKnown = (await AsyncStorage.getItem('push:lastToken')) || '';
          const pending = (await AsyncStorage.getItem('push:pendingToken')) || '';
          // If we haven't already queued a token, keep the last known one for retry.
          if (!pending && lastKnown) await AsyncStorage.setItem('push:pendingToken', lastKnown);
        } catch {}
        console.warn('Push token registration failed:', {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          url: err?.config?.url ?? err?.url,
          body: err?.body,
        });
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      console.log('Notification received (foreground):', { title, body, data });
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log('Notification response:', data);
      // You can route via expo-router here if you want:
      // if (typeof data?.action_url === 'string') router.push(data.action_url);
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);
}


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
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
          return;
        }

        const token = await registerForPushNotifications();
        if (!token) return;

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        const lastToken = (await AsyncStorage.getItem('push:lastToken')) || '';
        const pendingToken = (await AsyncStorage.getItem('push:pendingToken')) || '';
        const tokenToSend = pendingToken || token;
        if (tokenToSend === lastToken) {
          registeredRef.current = true;
          return;
        }

        await registerDeviceToken({ token: tokenToSend, platform });
        await AsyncStorage.setItem('push:lastToken', tokenToSend);
        await AsyncStorage.removeItem('push:pendingToken');
        registeredRef.current = true;
      } catch (e) {
        const err: any = e;
        try {
          const lastKnown = (await AsyncStorage.getItem('push:lastToken')) || '';
          const pending = (await AsyncStorage.getItem('push:pendingToken')) || '';
          if (!pending && lastKnown) await AsyncStorage.setItem('push:pendingToken', lastKnown);
        } catch {}
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);
}


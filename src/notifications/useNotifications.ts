import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { registerForPushNotifications } from './registerForPushNotifications';
import { registerAndSyncToken, getPendingToken } from '../services/deviceTokenService';

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

        // Check if there's a pending token that failed to register
        const pendingToken = await getPendingToken();
        const tokenToSend = pendingToken || token;

        // Register and sync token (handles AsyncStorage internally)
        await registerAndSyncToken(tokenToSend);
        registeredRef.current = true;
      } catch (e) {
        // deviceTokenService handles pending token storage internally
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


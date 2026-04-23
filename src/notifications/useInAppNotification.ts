import React, { useState, useCallback } from 'react';
import { NotificationBanner } from '@/src/components/notifications/NotificationBanner';
import { inAppNotificationService, InAppNotification } from './inAppNotificationService';

export function useInAppNotification() {
  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    onPress?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'success' | 'warning' | 'error' = 'info',
      options?: {
        duration?: number;
        onPress?: () => void;
      }
    ) => {
      setNotification({
        visible: true,
        title,
        message,
        type,
        onPress: options?.onPress,
      });

      // Also show using expo-notifications
      inAppNotificationService.showNotification({
        id: Date.now().toString(),
        title,
        body: message,
        onPress: options?.onPress,
      });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback(
    (message: string, options?: { duration?: number; onPress?: () => void }) => {
      showNotification('Thành công', message, 'success', options);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, options?: { duration?: number; onPress?: () => void }) => {
      showNotification('Lỗi', message, 'error', options);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, options?: { duration?: number; onPress?: () => void }) => {
      showNotification('Cảnh báo', message, 'warning', options);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: { duration?: number; onPress?: () => void }) => {
      showNotification(title, message, 'info', options);
    },
    [showNotification]
  );

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

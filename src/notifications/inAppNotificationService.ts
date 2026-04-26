import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  onPress?: () => void;
}

class InAppNotificationService {
  private notificationQueue: InAppNotification[] = [];
  private isShowing = false;

  /**
   * Show an in-app notification using expo-notifications
   */
  async showNotification(notification: InAppNotification): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      // Failed to show notification
    }
  }

  /**
   * Show multiple notifications (batch)
   */
  async showBatchNotifications(notifications: InAppNotification[]): Promise<void> {
    for (const notification of notifications) {
      await this.showNotification(notification);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Clear a specific notification by identifier
   */
  async clearNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Add notification to queue (for custom UI implementation)
   */
  addToQueue(notification: InAppNotification): void {
    this.notificationQueue.push(notification);
  }

  /**
   * Get next notification from queue
   */
  getNextFromQueue(): InAppNotification | null {
    if (this.notificationQueue.length === 0) return null;
    return this.notificationQueue.shift() || null;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.notificationQueue = [];
  }
}

export const inAppNotificationService = new InAppNotificationService();

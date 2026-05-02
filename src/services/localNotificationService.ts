import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface LocalNotificationData {
  conversationId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  type: 'chat:message' | 'group:invite:sent' | 'conversation:member:added' | 'system';
  [key: string]: any;
}

export interface ShowNotificationOptions {
  title: string;
  body: string;
  data?: LocalNotificationData;
  badge?: number;
}

/**
 * Local Push Notification Service
 * Dùng để hiển thị notification khi app đang chạy nền (background)
 * Lưu ý: KHÔNG hoạt động khi app bị kill hoàn toàn
 */
class LocalNotificationService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[LocalNotification] Permission not granted');
      return;
    }

    // Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Tin nhắn',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('group-invites', {
        name: 'Lời mời nhóm',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    this.initialized = true;
    console.log('[LocalNotification] Service initialized');
  }

  /**
   * Hiển thị local notification
   * Chỉ gọi khi app ở background và cần thông báo
   */
  async showNotification(options: ShowNotificationOptions): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
          badge: options.badge,
          sound: true,
          priority: Notifications.AndroidPriority.HIGH,
        },
        trigger: null, // Immediate notification
      });

      console.log('[LocalNotification] Scheduled:', notificationId, options.title);
      return notificationId;
    } catch (error) {
      console.error('[LocalNotification] Error showing notification:', error);
      return null;
    }
  }

  /**
   * Hiển thị notification tin nhắn mới
   */
  async showMessageNotification(
    senderName: string,
    messageBody: string,
    conversationId: string,
    messageId: string,
    senderId: string
  ): Promise<string | null> {
    return this.showNotification({
      title: senderName,
      body: messageBody || 'Đã gửi một tin nhắn',
      data: {
        type: 'chat:message',
        conversationId,
        messageId,
        senderId,
        senderName,
      },
    });
  }

  /**
   * Hiển thị notification lời mời nhóm
   */
  async showGroupInviteNotification(
    inviterName: string,
    conversationName: string,
    conversationId: string
  ): Promise<string | null> {
    return this.showNotification({
      title: 'Lời mời tham gia nhóm',
      body: `${inviterName} đã mời bạn vào nhóm ${conversationName || 'nhóm'}`,
      data: {
        type: 'group:invite:sent',
        conversationId,
        senderName: inviterName,
      },
    });
  }

  /**
   * Xóa tất cả notification
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Xóa badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Lấy danh sách notification đang hiển thị
   */
  async getPresentedNotifications(): Promise<Notifications.Notification[]> {
    return await Notifications.getPresentedNotificationsAsync();
  }
}

export const localNotificationService = new LocalNotificationService();

// React hook cho việc xử lý response từ notification
export function useNotificationResponse(handler: (data: LocalNotificationData) => void) {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as LocalNotificationData;
    handler(data);
  });
}

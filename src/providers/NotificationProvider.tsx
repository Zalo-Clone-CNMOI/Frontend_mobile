import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { appStateService } from '../services/appStateService';
import { localNotificationService, type LocalNotificationData } from '../services/localNotificationService';
import { useNotificationListener } from '../hooks/useNotificationListener';
import { useConversationRoomJoiner } from '../hooks/useConversationRoomJoiner';
import { createSocket } from '../services/socket';
import { initChat } from '../services/socket/initChat';

/**
 * NotificationProvider
 * 
 * Quản lý toàn bộ notification system:
 * - Khởi tạo local notification service
 * - Xử lý deep linking từ notification
 * - Kết hợp useNotificationListener cho WebSocket events
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const initializedRef = useRef(false);

  // Initialize services
  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) return;

    const initialize = async () => {
      // Initialize App State tracking
      appStateService.initialize();

      // Initialize Local Notification Service
      await localNotificationService.initialize();

      // Create socket connection early so handlers can receive events
      await createSocket();

      // Initialize chat socket handlers (CallHandler, ChatMessageHandler, etc.)
      initChat();

      initializedRef.current = true;
      console.log('[NotificationProvider] Services initialized');
    };

    initialize();

    return () => {
      // Don't cleanup on auth change, only on unmount
    };
  }, [isAuthenticated]);

  // Handle notification response (user taps notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as LocalNotificationData;
      console.log('[NotificationProvider] Notification tapped:', data);

      if (!data) return;

      // Navigate based on notification type
      switch (data.type) {
        case 'chat:message':
          if (data.conversationId) {
            router.push(`/chat/${data.conversationId}` as any);
          }
          break;

        case 'group:invite:sent':
        case 'conversation:member:added':
          if (data.conversationId) {
            router.push(`/chat/${data.conversationId}` as any);
          } else {
            router.push('/(tabs)' as any);
          }
          break;

        default:
          // Default to main screen
          router.push('/(tabs)' as any);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // WebSocket notification listener (for in-app notifications)
  console.log('[NotificationProvider] About to call useNotificationListener, isAuthenticated:', isAuthenticated);
  useNotificationListener();

  // Join all conversation rooms to receive realtime messages
  useConversationRoomJoiner();

  return <>{children}</>;
}

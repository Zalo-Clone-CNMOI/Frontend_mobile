# Notification System Documentation

## Tổng quan

Hệ thống notification đã được cải tiến để hỗ trợ:
- **Foreground**: In-app notification (toast/banner)
- **Background**: Local push notification
- **App killed**: Không hoạt động (xem phần Hạn chế)

## Luồng WebSocket từ Backend

### Event Names (Backend → Client)

| Event | Payload | Mô tả |
|-------|---------|-------|
| `chat:message` | `WsChatMessagePayload` | Tin nhắn mới |
| `chat:message:updated` | `WsChatMessageUpdatedPayload` | Tin nhắn đã sửa |
| `chat:message:deleted` | `WsChatMessageDeletedPayload` | Tin nhắn đã xóa |
| `chat:reaction:added` | `WsChatReactionAddedPayload` | Thêm reaction |
| `chat:reaction:removed` | `WsChatReactionRemovedPayload` | Xóa reaction |
| `group:invite:sent` | `WsGroupInviteSentPayload` | Lời mời nhóm |
| `conversation:member:added` | `WsConversationMemberAddedPayload` | Thêm thành viên |

### Payload Structure (`chat:message`)

```typescript
{
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: number;
  attachments?: WsMessageAttachment[];
  reply_to_message_id?: string;
  forwarded_from?: {...};
}
```

## Các File mới/tạo

### 1. `src/services/appStateService.ts`
- Theo dõi trạng thái app (active/background/inactive)
- Hook `useAppState()` để lấy state hiện tại

### 2. `src/services/localNotificationService.ts`
- Hiển thị local push notification (chỉ khi app ở background)
- Các hàm:
  - `showMessageNotification()` - Notification tin nhắn
  - `showGroupInviteNotification()` - Notification lời mời nhóm
  - `clearAllNotifications()` - Xóa tất cả

### 3. `src/hooks/useMessageNotification.ts` (Optional)
- Hook nâng cao cho việc xử lý tin nhắn realtime
- Tích hợp với stores để update UI

### 4. `src/providers/NotificationProvider.tsx`
- Provider component wrap toàn bộ app
- Khởi tạo các services
- Xử lý deep linking từ notification

### 5. `src/hooks/useNotificationListener.ts` (Updated)
- Đã thêm xử lý background state
- Đã thêm local notification cho tin nhắn và lời mời nhóm
- Export `setCurrentConversationId()` để track conversation hiện tại

## Cách sử dụng

### 1. Đã được tích hợp tự động

Trong `app/_layout.tsx`:
```tsx
<NotificationProvider>
  <NavigationThemeWrapper>
    {/* App content */}
  </NavigationThemeWrapper>
</NotificationProvider>
```

### 2. Track current conversation (đã có trong ChatDetail)

Trong `app/chat/[id].tsx`:
```tsx
useEffect(() => {
  if (chatId) {
    setCurrentConversationId(chatId);
  }
  return () => {
    setCurrentConversationId(null);
  };
}, [chatId]);
```

### 3. Manual notification (nếu cần)

```typescript
import { localNotificationService } from '@/src/services/localNotificationService';

// Hiển thị notification
await localNotificationService.showNotification({
  title: 'Tiêu đề',
  body: 'Nội dung',
  data: { type: 'custom', conversationId: '123' }
});
```

## Hạn chế quan trọng

### WebSocket khi app bị kill

**WebSocket KHÔNG hoạt động khi app bị kill hoàn toàn** (swipe away from recents).

Điều này là hạn chế của mobile OS (iOS/Android):
- Không cho phép background process chạy tùy tiện
- Để tiết kiệm pin

### Giải pháp: Push Notification (FCM)

Để nhận notification khi app bị kill, cần tích hợp **Firebase Cloud Messaging (FCM)**:

1. **Backend**: Gửi push notification qua FCM API
2. **Frontend**: Đăng ký FCM token và gửi lên server

Backend đã có `notification-service` sử dụng Firebase để gửi push notification. Cần:
- Đảm bảo `expo-notifications` được cấu hình đúng
- Backend cần gửi FCM message khi có tin nhắn mới
- Xử lý data payload trong notification handler

### Cấu hình FCM (Future)

```typescript
// Trong useNotifications.ts (đã có)
const token = await registerForPushNotifications();
await registerAndSyncToken(token);
```

Backend cần gửi notification với data payload:
```json
{
  "notification": {
    "title": "Tên người gửi",
    "body": "Nội dung tin nhắn"
  },
  "data": {
    "type": "chat:message",
    "conversationId": "xxx",
    "messageId": "yyy"
  }
}
```

## Cấu trúc Notification

### In-App Notification (Foreground)

```
┌─────────────────────────────────────┐
│  👤 Tên người gửi           [X]     │
│  Nội dung tin nhắn...               │
└─────────────────────────────────────┘
```

### Local Push Notification (Background)

```
┌─────────────────────────────────────┐
│  📱 App Name                        │
│  👤 Tên người gửi                   │
│  Nội dung tin nhắn...               │
└─────────────────────────────────────┘
```

## Xử lý khi click Notification

Khi user click notification:
1. `NotificationProvider` nhận event từ `expo-notifications`
2. Điều hướng đến màn hình chat tương ứng
3. Truyền `conversationId` qua router

## Debug

### Log messages để theo dõi:

```
[AppStateService] State changed: active
[LocalNotification] Service initialized
[NotificationListener] Current conversation set to: xxx
[NotificationListener] New message: {...}
[NotificationListener] App state: {isBackground: false, isInConversation: true}
```

### Test scenarios:

1. **App foreground + in conversation**: Không có notification
2. **App foreground + other screen**: In-app notification
3. **App background**: Local push notification
4. **App killed**: Không có notification (cần FCM)

## Dependencies

- `expo-notifications`: Local push notification
- `@react-native-async-storage/async-storage`: Token storage
- `socket.io-client`: WebSocket connection

## Migration Notes

- Các file cũ như `useChatSocket.ts` vẫn giữ nguyên (đã deprecated)
- Không ảnh hưởng đến chức năng hiện tại
- Tất cả changes là additive

## Troubleshooting

### Không nhận được notification

1. Check permission:
   ```typescript
   const { status } = await Notifications.getPermissionsAsync();
   console.log(status); // should be 'granted'
   ```

2. Check app state:
   ```typescript
   console.log(appStateService.getCurrentState());
   ```

3. Check socket connection:
   ```typescript
   console.log(getSocket()?.connected);
   ```

### Notification không navigate đúng

- Kiểm tra `data` trong notification payload
- Đảm bảo `router.push()` được gọi với đúng path

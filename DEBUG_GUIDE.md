# Debug Notification System

## Các log cần kiểm tra trong Metro Console

Khi app khởi động, bạn nên thấy các log sau:

### 1. Socket Connection
```
[Socket] Creating new socket connection to <ws_url>
[Socket] Connected successfully <socket_id>
[Socket] ⬇️ Incoming event: <event_name>
```

### 2. NotificationProvider
```
[NotificationProvider] About to call useNotificationListener, isAuthenticated: true
[NotificationProvider] Services initialized
```

### 3. NotificationListener Setup
```
[NotificationListener] Setting up listeners, socket: <id> connected: true userId: <user_id>
[NotificationListener] Registering event listeners for: chat:message group:invite:sent conversation:member:added
[NotificationListener] Listeners registered successfully
```

### 4. Khi có tin nhắn mới (từ user khác)
```
[Socket] ⬇️ Incoming event: chat:message [{...payload...}]
[NotificationListener] ChatMessage received: {...}
[NotificationListener] Parsed: {conversationId: "...", senderId: "...", senderName: "...", ...}
[NotificationListener] Showing in-app notification: <sender_name> <body>
```

---

## Nếu KHÔNG thấy log

### Trường hợp 1: Không thấy `[Socket] ⬇️ Incoming event`
**Nguyên nhân**: Backend không gửi event
**Kiểm tra**:
1. Backend `ws-gateway` đã restart sau khi sửa code chưa?
2. Chat service có emit `ChatMessageCreatedEvent` không?
3. Kafka có đang chạy không?

### Trường hợp 2: Thấy `[Socket] ⬇️ Incoming event` nhưng không thấy `[NotificationListener] ChatMessage received`
**Nguyên nhân**: Listener chưa được register
**Kiểm tra**:
1. `useNotificationListener()` được gọi chưa?
2. `userId` có giá trị chưa?
3. Socket có connected không?

### Trường hợp 3: Thấy `[NotificationListener] ChatMessage received` nhưng không thấy notification
**Nguyên nhân**: Logic filter hoặc UI không hiển thị
**Kiểm tra**:
1. Log `isInConversation` - có phải đang ở trong conversation không?
2. Log `appActive` - app có đang active không?
3. `showInfo` có được gọi không?

---

## Các bước fix

### Bước 1: Verify Backend Changes đã được apply

Vào file `backend/apps/ws-gateway/src/transport/fanout/chat-fanout.consumer.ts` kiểm tra:

1. Có `User` repository inject không?
```typescript
@InjectRepository(User)
private readonly userRepo: Repository<User>,
```

2. Có emit đến từng user không?
```typescript
for (const userId of memberUserIds) {
  this.gateway.emitToUser(userId, WsEvents.ChatMessage, base);
}
```

3. Có `sender_name` trong payload không?
```typescript
const base = {
  ...
  sender_name: senderName,
  ...
};
```

### Bước 2: Restart Backend Services

```bash
# Ở thư mục backend
cd backend

# Restart ws-gateway
npm run start:dev ws-gateway

# Hoặc nếu dùng docker
docker-compose restart ws-gateway
```

### Bước 3: Verify Frontend Socket Events

Thêm log tạm trong `useNotificationListener.ts`:

```typescript
useEffect(() => {
  const socket = getSocket();
  console.log('[DEBUG] Socket:', socket?.id, 'connected:', socket?.connected);
  console.log('[DEBUG] userId:', userId);
  
  if (!socket || !userId) {
    console.log('[DEBUG] Early return - missing socket or userId');
    return;
  }
  
  // Test listener
  const testHandler = (payload: any) => {
    console.log('[DEBUG] TEST EVENT RECEIVED:', payload);
  };
  
  socket.on('chat:message', testHandler);
  console.log('[DEBUG] Registered chat:message listener');
  
  return () => {
    socket.off('chat:message', testHandler);
  };
}, [userId]);
```

### Bước 4: Test thủ công

Mở 2 device/emulator:
- Device A: User A (đăng nhập)
- Device B: User B (đăng nhập)

Từ Device B gửi tin nhắn đến conversation có User A.

Trên Device A, kiểm tra console log.

---

## Test với WebSocket trực tiếp (không qua app)

Nếu muốn test backend có emit event không:

```javascript
// Mở browser console ở trang bất kỳ
const socket = io('ws://localhost:3000', {
  auth: { token: 'Bearer YOUR_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('chat:message', (data) => {
  console.log('Received:', data);
});
```

---

## Common Issues

### Issue: `sender_id` === `userId` (message from self)
Kiểm tra log: `[NotificationListener] Message from self, skipping`
→ Bạn đang test bằng cách gửi tin nhắn từ chính mình. Hãy dùng 2 account khác nhau.

### Issue: `isInConversation` = true
Kiểm tra log: `[NotificationListener] In conversation and app active, skipping notification`
→ Bạn đang ở trong conversation đó. Chuyển sang tab khác để test.

### Issue: Socket disconnected
Kiểm tra log: `[Socket] Disconnected ...`
→ Mất kết nối. Kiểm tra network hoặc server.

---

## Kiểm tra nhanh checklist

- [ ] Backend ws-gateway đã restart sau khi sửa code
- [ ] Kafka đang chạy
- [ ] Frontend đã rebuild (nếu dùng Expo, clear cache)
- [ ] User đã login (có token)
- [ ] Socket connected (`[Socket] Connected successfully`)
- [ ] Test với 2 user khác nhau (không phải gửi cho chính mình)
- [ ] Không ở trong conversation khi test (hoặc app ở background)

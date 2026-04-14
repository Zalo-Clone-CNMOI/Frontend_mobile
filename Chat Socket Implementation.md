# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

đọc luồn avatar update và viết prompt để sử lí trên FE

### Planner Response

I'll search for the avatar update flow in the backend code.











*Searched filesystem*

*Listed directory [Backend](file:///d:/IUH/KTPM_DOAN/Backend) *

*Searched filesystem*



*Searched filesystem*

*Listed directory [user-service](file:///d:/IUH/KTPM_DOAN/Backend/user-service) *

*Listed directory [auth-service](file:///d:/IUH/KTPM_DOAN/Backend/auth-service) *

*Listed directory [realtime-service](file:///d:/IUH/KTPM_DOAN/Backend/realtime-service) *







*Searched filesystem*

*Viewed [chat.controller.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/interface/http/chat.controller.ts) *



*Viewed [1710000000000-create-chat-schema.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/database/migrations/1710000000000-create-chat-schema.ts) *

*Searched filesystem*

### Planner Response

Tôi đã tìm kiếm trong backend nhưng không tìm thấy luồng cập nhật avatar nào. Backend hiện tại chỉ có:

- **chat-service**: Chỉ quản lý conversations và messages
- **user-service**: Chưa có code (chỉ .gitkeep)
- **auth-service**: Chưa có code (chỉ .gitkeep)

Database schema hiện tại không có bảng users hay field avatar.

Bạn muốn:
1. Tôi **thiết kế và implement** luồng avatar update trong backend trước?
2. Hay luồng avatar đã có ở nơi khác mà tôi chưa tìm thấy?

Nếu cần implement backend, tôi sẽ tạo:
- User entity với avatar field
- Avatar upload endpoint (user-service)
- Storage service (S3/local)
- API endpoint để update avatar

Bạn có muốn tôi implement backend trước không?

### User Input

đọc luôn back end liên quan đến 2 ảnh trên và viết prompt sử lí trên FE









*Viewed [docker-compose.yml](file:///d:/IUH/KTPM_DOAN/Backend/docker-compose.yml) *

*Listed directory [shared](file:///d:/IUH/KTPM_DOAN/Backend/shared) *

*Searched filesystem*











*Searched filesystem*

*Listed directory [api-gateway](file:///d:/IUH/KTPM_DOAN/Backend/api-gateway) *





*Viewed [header-auth.guard.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/common/auth/header-auth.guard.ts) *



*Searched filesystem*

*Viewed [README.md](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/README.md) *

### Planner Response

Tôi đã tìm kiếm backend nhưng không tìm thấy code cho endpoint media/presign/download. Backend hiện tại chỉ có chat-service (port 3003) với các endpoint về conversations/messages, chưa có service quản lý file/media.

Dựa trên 2 ảnh bạn cung cấp, đây là prompt để implement FE:

---

# Frontend Implementation: Download Private Files

## API Endpoint
- **Method**: POST
- **URL**: `http://<<host>:3003/api/v1/media/presign/download`
- **Headers**:
  - `Content-Type: application/json`
  - `x-user-id: [userId]` (Required - lấy từ auth context)

## Request Body
```json
{
  "key": "string" // Key của file cần download
}
```

## Response Body
```json
{
  "downloadUrl": "string", // Presigned S3 GET URL, hết hạn sau ~15 phút
  "expiresAt": "number"    // Epoch milliseconds khi URL hết hạn
}
```

## Access Control Rules
- **public files**: Tất cả đều có thể download
- **private + uploader**: Luôn được phép
- **private + conversation member**: Được phép nếu file thuộc conversation đó
- **private + external user**: 403 Forbidden

## Error Handling
- **401**: Thiếu header `x-user-id` → Hiển thị "Bạn cần đăng nhập để tải file"
- **403**: Không có quyền → Hiển thị "Bạn không có quyền tải file này"
- **Other errors**: Hiển thị "Lỗi khi tải file, vui lòng thử lại"

## Yêu cầu Implementation

### 1. Tạo service function
```typescript
// services/mediaService.ts
export const downloadPrivateFile = async (fileKey: string, userId: string) => {
  // Implement theo API spec trên
}
```

### 2. Tạo React hook
```typescript
// hooks/useDownloadFile.ts
export const useDownloadFile = () => {
  // State: loading, error
  // Function: downloadFile(fileKey)
  // Handle error cases theo rules
}
```

### 3. UI Component
- Button "Download" với loading state
- Error toasts/messages
- Xử lý khi downloadUrl expired (refresh nếu cần)

### 4. Integration
- Lấy userId từ auth context (localStorage, Redux, hoặc auth provider)
- Gọi hook trong component cần download file

---

**Lưu ý**: Backend endpoint này chưa tồn tại trong codebase hiện tại. Bạn cần implement backend trước hoặc endpoint này đang ở service khác (media-service chưa được tạo).

### User Input

đọc luồn sử lí socket sử lí cho chat như thêm xóa sửa tin nhắn ,... rồi viết prompt gắn cho fe







*Listed directory [realtime-service](file:///d:/IUH/KTPM_DOAN/Backend/realtime-service) *







*Viewed [rabbitmq-event.publisher.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/infrastructure/events/rabbitmq/rabbitmq-event.publisher.ts) *

*Viewed [new-message-event.model.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/domain/models/new-message-event.model.ts) *

*Viewed [send-message.use-case.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/application/use-cases/send-message.use-case.ts) *

*Viewed [outbox.processor.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/infrastructure/events/outbox/outbox.processor.ts) *

*Viewed [outbox-event.model.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/domain/models/outbox-event.model.ts) *





*Viewed [event.publisher.ts](file:///d:/IUH/KTPM_DOAN/Backend/chat-service/src/chat/application/ports/event.publisher.ts) *

### Planner Response

Tôi đã đọc backend và tìm thấy:

## Hiện trạng Backend

**Chat-service** sử dụng **RabbitMQ Events** (không có WebSocket):

- **Event duy nhất**: `NEW_MESSAGE`
- **Exchange**: `chat.events`
- **Routing key**: `chat.new_message`
- **Payload**:
```typescript
{
  eventId: string;
  eventType: 'NEW_MESSAGE';
  occurredAt: string;
  conversationId: string;
  conversationType: ConversationType;
  messageId: string;
  senderId: string;
  participantIds: string[];
  contentType: MessageContentType;
  content: string;
  createdAt: string;
}
```

**Không có**:
- WebSocket/Socket.io implementation
- DELETE_MESSAGE event
- EDIT_MESSAGE event
- realtime-service code (chỉ .gitkeep)

---

## Prompt cho FE (Dựa trên RabbitMQ Events)

### Option 1: WebSocket (Cần implement realtime-service trước)

```
# Frontend Socket Implementation for Chat Real-time

## Backend Architecture
- Backend sử dụng RabbitMQ events để publish message events
- realtime-service sẽ subscribe RabbitMQ và broadcast qua WebSocket
- Port: Chưa xác định (realtime-service chưa được implement)

## Events cần xử lý

### 1. NEW_MESSAGE
Khi nhận tin nhắn mới:
- Payload: { eventId, eventType, conversationId, messageId, senderId, participantIds, contentType, content, createdAt }
- Action: Thêm tin nhắn vào conversation tương ứng
- UI: Update message list, show notification nếu不在 current conversation

### 2. DELETE_MESSAGE (Chưa có trong backend, cần implement)
- Payload: { messageId, conversationId, deletedBy, deletedAt }
- Action: Xóa tin nhắn khỏi UI
- UI: Show "Tin nhắn đã bị xóa" hoặc remove hoàn toàn

### 3. EDIT_MESSAGE (Chưa có trong backend, cần implement)
- Payload: { messageId, conversationId, newContent, editedBy, editedAt }
- Action: Update content tin nhắn
- UI: Show "đã chỉnh sửa" badge với timestamp

## Implementation Requirements

### 1. WebSocket Connection
```typescript
// services/socketService.ts
- connect(userId: string)
- disconnect()
- on(event: string, callback: Function)
- emit(event: string, data: any)
- Reconnection logic
```

### 2. React Hook
```typescript
// hooks/useChatSocket.ts
export const useChatSocket = (userId: string) => {
  // Handle NEW_MESSAGE
  // Handle DELETE_MESSAGE
  // Handle EDIT_MESSAGE
  // Handle connection state
}
```

### 3. Event Handlers
- NEW_MESSAGE: Dispatch action để thêm message vào Redux/Context
- DELETE_MESSAGE: Dispatch action để xóa message
- EDIT_MESSAGE: Dispatch action để update message

### 4. UI Updates
- Auto-scroll to bottom khi có tin nhắn mới
- Show typing indicators
- Show online status
- Handle message read receipts

### 5. Error Handling
- Connection lost: Show toast, attempt reconnect
- Message delivery failed: Show retry button
```

### Option 2: RabbitMQ Direct (Không dùng WebSocket)

```
# Frontend RabbitMQ Consumer for Chat Events

## Architecture
- FE connect trực tiếp đến RabbitMQ hoặc qua API polling
- Subscribe queue riêng cho mỗi user: `user.{userId}.events`

## Implementation

### 1. RabbitMQ Client (stomp.js hoặc amqplib)
```typescript
// services/rabbitmqService.ts
- connect(userId: string)
- subscribe(queue: string, callback: Function)
- unsubscribe(queue: string)
```

### 2. Event Processing
- Parse NEW_MESSAGE payload
- Update UI tương ứng
- Handle reconnection

### 3. Fallback: Polling
Nếu RabbitMQ không khả thi từ browser:
- Poll API GET /conversations/:id/messages?after={lastTimestamp}
- Interval: 3-5 seconds
```

---

**Lưu ý**: Backend hiện tại chỉ có NEW_MESSAGE event. Bạn cần implement DELETE và EDIT events trong backend trước khi xử lý trên FE.

### User Input

đọc luồn sử lí socket sử lí cho chat như thêm xóa sửa tin nhắn ,... rồi viết prompt gắn cho fe



*Listed directory [api-gateway](file:///d:/IUH/KTPM_DOAN/Backend/api-gateway) *











*Listed directory [Backend](file:///d:/IUH/CNMOI_DOAN/Backend) *

*Viewed [chat.gateway.ts](file:///d:/IUH/CNMOI_DOAN/Backend/apps/ws-gateway/src/socket/chat.gateway.ts) *

*Viewed [events.ts](file:///d:/IUH/CNMOI_DOAN/Backend/libs/contracts/src/ws/events.ts) *

*Viewed [chat.handler.ts](file:///d:/IUH/CNMOI_DOAN/Backend/apps/ws-gateway/src/socket/handlers/chat.handler.ts) *

*Viewed [chat-fanout.consumer.ts](file:///d:/IUH/CNMOI_DOAN/Backend/apps/ws-gateway/src/transport/fanout/chat-fanout.consumer.ts) *

### Planner Response

Đã đọc xong luồng socket xử lý chat. Đây là prompt để implement trên FE:

---

# Frontend Socket Implementation for Chat Real-time

## Backend Architecture

**WebSocket Gateway**: `ws-gateway` (Socket.io)
- **Auth**: JWT token qua header `Authorization: Bearer <token>` hoặc `socket.handshake.auth.token`
- **Transport**: Kafka + Socket.io (Client → Kafka → Chat Service → Kafka → Fanout → Socket.io Broadcast)

## Socket Events Overview

### Client → Server (Send)

| Event | Payload | Purpose |
|-------|---------|---------|
| `chat:join` | `{ conversation_id: string }` | Join conversation room |
| `chat:send` | `{ message_id, conversation_id, body, sent_at, attachments?, reply_to_message_id? }` | Send new message |
| `chat:edit` | `{ message_id, conversation_id, new_body, created_at }` | Edit message |
| `chat:delete` | `{ message_id, conversation_id, created_at }` | Delete message |
| `chat:react` | `{ message_id, conversation_id, reaction_type }` | Add reaction |
| `chat:unreact` | `{ message_id, conversation_id }` | Remove reaction |
| `chat:typing` | `{ conversation_id, username }` | Typing indicator |
| `presence:heartbeat` | `{ ts: number }` | Keep connection alive |

### Server → Client (Receive/Broadcast)

| Event | Payload | Purpose |
|-------|---------|---------|
| `chat:message` | `{ message_id, conversation_id, sender_id, body, created_at, attachments?, reply_to_message_id? }` | New message received |
| `chat:message:updated` | `{ message_id, conversation_id, sender_id, body, edited_at }` | Message edited |
| `chat:message:deleted` | `{ message_id, conversation_id, sender_id, deleted_at }` | Message deleted |
| `chat:reaction:added` | `{ message_id, conversation_id, user_id, reaction_type }` | Reaction added |
| `chat:reaction:removed` | `{ message_id, conversation_id, user_id }` | Reaction removed |
| `chat:typing:update` | `{ conversation_id, users: [{ user_id, username }] }` | Typing users list |
| `presence:update` | `{ user_id, status, last_seen_at, expires_at }` | User presence |
| `chat:ack` | `{ message_id, status: 'accepted'\|'rejected', reason? }` | Ack for send/edit/delete/react |
| `ws:error` | `{ code, message, details?, timestamp? }` | Error response |

## Implementation Requirements

### 1. Socket Service Layer

```typescript
// services/socketService.ts
import { io, Socket } from 'socket.io-client';

interface SocketConfig {
  url: string;
  token: string;
  userId: string;
}

class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig | null = null;

  connect(config: SocketConfig) {
    this.config = config;
    this.socket = io(config.url, {
      auth: { token: config.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Chat events
  joinConversation(conversationId: string) {
    this.socket?.emit('chat:join', { conversation_id: conversationId });
  }

  sendMessage(payload: WsChatSendPayload) {
    this.socket?.emit('chat:send', payload);
  }

  editMessage(payload: WsChatEditPayload) {
    this.socket?.emit('chat:edit', payload);
  }

  deleteMessage(payload: WsChatDeletePayload) {
    this.socket?.emit('chat:delete', payload);
  }

  addReaction(payload: WsChatReactPayload) {
    this.socket?.emit('chat:react', payload);
  }

  removeReaction(payload: WsChatUnreactPayload) {
    this.socket?.emit('chat:unreact', payload);
  }

  sendTyping(conversationId: string, username: string) {
    this.socket?.emit('chat:typing', { conversation_id: conversationId, username });
  }

  sendHeartbeat() {
    this.socket?.emit('presence:heartbeat', { ts: Date.now() });
  }

  // Event listeners
  onMessage(callback: (payload: WsChatMessagePayload) => void) {
    this.socket?.on('chat:message', callback);
  }

  onMessageUpdated(callback: (payload: WsChatMessageUpdatedPayload) => void) {
    this.socket?.on('chat:message:updated', callback);
  }

  onMessageDeleted(callback: (payload: WsChatMessageDeletedPayload) => void) {
    this.socket?.on('chat:message:deleted', callback);
  }

  onReactionAdded(callback: (payload: WsChatReactionAddedPayload) => void) {
    this.socket?.on('chat:reaction:added', callback);
  }

  onReactionRemoved(callback: (payload: WsChatReactionRemovedPayload) => void) {
    this.socket?.on('chat:reaction:removed', callback);
  }

  onTypingUpdate(callback: (payload: WsChatTypingUpdatePayload) => void) {
    this.socket?.on('chat:typing:update', callback);
  }

  onPresenceUpdate(callback: (payload: WsPresenceUpdatePayload) => void) {
    this.socket?.on('presence:update', callback);
  }

  onAck(callback: (payload: WsChatAckPayload) => void) {
    this.socket?.on('chat:ack', callback);
  }

  onError(callback: (error: WsErrorPayload) => void) {
    this.socket?.on('ws:error', callback);
  }

  private setupEventListeners() {
    this.socket?.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket?.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket?.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
}

export const socketService = new SocketService();
```

### 2. React Hook for Chat Socket

```typescript
// hooks/useChatSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '@/services/socketService';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';

export const useChatSocket = () => {
  const { token, userId } = useAuth();
  const { addMessage, updateMessage, deleteMessage, addReaction, removeReaction, updateTypingUsers } = useChatStore();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!token || !userId) return;

    // Connect socket
    socketService.connect({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      token,
      userId,
    });

    // Setup event listeners
    const unsubscribe = setupEventListeners();

    // Start heartbeat (every 30s)
    heartbeatIntervalRef.current = setInterval(() => {
      socketService.sendHeartbeat();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(heartbeatIntervalRef.current);
      socketService.disconnect();
    };
  }, [token, userId]);

  const setupEventListeners = () => {
    const unsubscribers: (() => void)[] = [];

    // New message
    socketService.onMessage((payload) => {
      addMessage(payload);
      // Show notification if not in current conversation
    });
    unsubscribers.push(() => socketService.socket?.off('chat:message'));

    // Message updated
    socketService.onMessageUpdated((payload) => {
      updateMessage(payload);
    });
    unsubscribers.push(() => socketService.socket?.off('chat:message:updated'));

    // Message deleted
    socketService.onMessageDeleted((payload) => {
      deleteMessage(payload);
    });
    unsubscribers.push(() => socketService.socket?.off('chat:message:deleted'));

    // Reaction added
    socketService.onReactionAdded((payload) => {
      addReaction(payload);
    });
    unsubscribers.push(() => socketService.socket?.off('chat:reaction:added'));

    // Reaction removed
    socketService.onReactionRemoved((payload) => {
      removeReaction(payload);
    });
    unsubscribers.push(() => socketService.socket?.off('chat:reaction:removed'));

    // Typing update
    socketService.onTypingUpdate((payload) => {
      updateTypingUsers(payload);
    });
    unsubscribers.push(() => socketService.socket?.off('chat:typing:update'));

    // Presence update
    socketService.onPresenceUpdate((payload) => {
      // Update user presence in store
    });
    unsubscribers.push(() => socketService.socket?.off('presence:update'));

    // Ack (for sent messages)
    socketService.onAck((payload) => {
      if (payload.status === 'rejected') {
        // Handle rejection (show error, retry, etc.)
        console.error('Message rejected:', payload.reason);
      }
    });
    unsubscribers.push(() => socketService.socket?.off('chat:ack'));

    // Error handling
    socketService.onError((error) => {
      console.error('Socket error:', error);
      // Show error toast
    });
    unsubscribers.push(() => socketService.socket?.off('ws:error'));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  };

  // Actions
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
  }, []);

  const sendMessage = useCallback((payload: WsChatSendPayload) => {
    socketService.sendMessage(payload);
  }, []);

  const editMessage = useCallback((payload: WsChatEditPayload) => {
    socketService.editMessage(payload);
  }, []);

  const deleteMessage = useCallback((payload: WsChatDeletePayload) => {
    socketService.deleteMessage(payload);
  }, []);

  const addReaction = useCallback((payload: WsChatReactPayload) => {
    socketService.addReaction(payload);
  }, []);

  const removeReaction = useCallback((payload: WsChatUnreactPayload) => {
    socketService.removeReaction(payload);
  }, []);

  const sendTyping = useCallback((conversationId: string, username: string) => {
    socketService.sendTyping(conversationId, username);
  }, []);

  return {
    joinConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    sendTyping,
  };
};
```

### 3. Zustand/Redux Store for Chat State

```typescript
// stores/chatStore.ts
import { create } from 'zustand';

interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: number;
  attachments?: WsMessageAttachment[];
  reply_to_message_id?: string;
  edited_at?: number;
  deleted_at?: number;
  reactions?: Reaction[];
}

interface Reaction {
  user_id: string;
  reaction_type: string;
}

interface ChatState {
  messages: Record<string, Message[]>; // conversation_id -> messages
  typingUsers: Record<string, WsChatTypingUser[]>; // conversation_id -> users
  
  addMessage: (payload: WsChatMessagePayload) => void;
  updateMessage: (payload: WsChatMessageUpdatedPayload) => void;
  deleteMessage: (payload: WsChatMessageDeletedPayload) => void;
  addReaction: (payload: WsChatReactionAddedPayload) => void;
  removeReaction: (payload: WsChatReactionRemovedPayload) => void;
  updateTypingUsers: (payload: WsChatTypingUpdatePayload) => void;
}

export const useChatStore = create<<ChatState>((set) => ({
  messages: {},
  typingUsers: {},

  addMessage: (payload) => set((state) => ({
    messages: {
      ...state.messages,
      [payload.conversation_id]: [
        ...(state.messages[payload.conversation_id] || []),
        {
          message_id: payload.message_id,
          conversation_id: payload.conversation_id,
          sender_id: payload.sender_id,
          body: payload.body,
          created_at: payload.created_at,
          attachments: payload.attachments,
          reply_to_message_id: payload.reply_to_message_id,
        },
      ],
    },
  })),

  updateMessage: (payload) => set((state) => ({
    messages: {
      ...state.messages,
      [payload.conversation_id]: state.messages[payload.conversation_id]?.map(msg =>
        msg.message_id === payload.message_id
          ? { ...msg, body: payload.body, edited_at: payload.edited_at }
          : msg
      ) || [],
    },
  })),

  deleteMessage: (payload) => set((state) => ({
    messages: {
      ...state.messages,
      [payload.conversation_id]: state.messages[payload.conversation_id]?.map(msg =>
        msg.message_id === payload.message_id
          ? { ...msg, deleted_at: payload.deleted_at }
          : msg
      ) || [],
    },
  })),

  addReaction: (payload) => set((state) => ({
    messages: {
      ...state.messages,
      [payload.conversation_id]: state.messages[payload.conversation_id]?.map(msg =>
        msg.message_id === payload.message_id
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                { user_id: payload.user_id, reaction_type: payload.reaction_type },
              ],
            }
          : msg
      ) || [],
    },
  })),

  removeReaction: (payload) => set((state) => ({
    messages: {
      ...state.messages,
      [payload.conversation_id]: state.messages[payload.conversation_id]?.map(msg =>
        msg.message_id === payload.message_id
          ? {
              ...msg,
              reactions: msg.reactions?.filter(r => r.user_id !== payload.user_id),
            }
          : msg
      ) || [],
    },
  })),

  updateTypingUsers: (payload) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [payload.conversation_id]: payload.users,
    },
  })),
}));
```

### 4. Usage in Component

```typescript
// components/ChatRoom.tsx
import { useEffect, useState } from 'react';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useChatStore } from '@/stores/chatStore';
import { v4 as uuidv4 } from 'uuid';

export const ChatRoom = ({ conversationId, currentUserId, username }) => {
  const { joinConversation, sendMessage, editMessage, deleteMessage, addReaction, sendTyping } = useChatSocket();
  const messages = useChatStore(state => state.messages[conversationId] || []);
  const typingUsers = useChatStore(state => state.typingUsers[conversationId] || []);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    joinConversation(conversationId);
  }, [conversationId, joinConversation]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const messageId = uuidv4();
    sendMessage({
      message_id: messageId,
      conversation_id: conversationId,
      body: inputText,
      sent_at: Date.now(),
    });
    setInputText('');
  };

  const handleEditMessage = (messageId: string, newBody: string) => {
    editMessage({
      message_id: messageId,
      conversation_id: conversationId,
      new_body: newBody,
      created_at: Date.now(),
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage({
      message_id: messageId,
      conversation_id: conversationId,
      created_at: Date.now(),
    });
  };

  const handleTyping = () => {
    sendTyping(conversationId, username);
  };

  // Render messages, typing indicator, etc.
  return (
    <div>
      {/* Messages list */}
      {messages.map(msg => (
        <MessageBubble
          key={msg.message_id}
          message={msg}
          isOwn={msg.sender_id === currentUserId}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReact={addReaction}
        />
      ))}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}

      {/* Input */}
      <input
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onInput={handleTyping}
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};
```

### 5. Error Handling & Reconnection

```typescript
// Handle connection errors
socketService.onError((error) => {
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Show rate limit toast
  } else {
    // Show generic error
  }
});

// Handle reconnection
socketService.socket?.on('reconnect', () => {
  // Re-join current conversation
  // Re-sync messages if needed
});
```

## Key Points

1. **Message ID**: Client generates `message_id` (UUID) before sending
2. **Ack**: Server returns `chat:ack` with status - handle rejections
3. **Optimistic UI**: Show message immediately, rollback on rejection
4. **Typing**: Debounce typing events (send every 2-3s while typing)
5. **Heartbeat**: Send every 30s to keep connection alive
6. **Reconnection**: Auto-reconnect with exponential backoff
7. **Room Management**: Join `conv:{conversationId}` room when entering chat
8. **Attachment Validation**: Backend validates ownership before sending to Kafka
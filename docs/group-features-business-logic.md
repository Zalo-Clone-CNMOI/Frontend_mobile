# Group Features - Business Logic Specification (Updated with S1-S19)

## 1. Scope

Backend hiện tại hỗ trợ đầy đủ các nhóm action sau:
- Tạo nhóm
- Sửa thông tin nhóm (tên, avatar)
- Thêm thành viên trực tiếp
- Mời vào nhóm qua invite (pending/accept/reject/cancel/expired)
- Xóa thành viên
- Rời nhóm
- Giải tan nhóm
- Đổi role thành viên (owner/admin/member)
- Cập nhật setting riêng trong nhóm (nickname, mute)

## 2. Entry Point

**BFF Endpoint:**
- Base URL: `http://<host>:5000`
- Prefix: `/conversations`
- Auth: `Authorization: Bearer <token>`

**WebSocket:**
- URL: `ws://<host>:3001`
- Auth: socket auth token

## 3. REST API Endpoints

### 3.1 Disband Conversation

**Endpoint:** `POST /conversations/:conversationId/disband`

**Conditions (S5):**
- Chỉ owner mới được disband
- Disband fail nếu không có member nào khác → return CONVERSATION_CANNOT_LEAVE
- Behavior khi partial failure (không thể cancel một số invites) → return error với detail

**Request:**
```json
{
  "conversationId": "uuid"
}
```

**Response (Success 200):**
```json
{
  "message": "Group disbanded successfully",
  "membersRemoved": 5,
  "invitesCancelled": 3
}
```

**Response (Partial Failure 400):**
```json
{
  "error": "PARTIAL_FAILURE",
  "message": "Some invites could not be cancelled",
  "membersRemoved": 5,
  "invitesCancelled": 2,
  "failedInvites": [
    { "inviteId": "invite-1", "reason": "invite_already_accepted" }
  ]
}
```

### 3.2 Send Invites

**Endpoint:** `POST /conversations/:conversationId/invites`

**Validation:**
- `userIds`: min 1, max 50, uuid v4
- `message`: optional, max 500
- `expiresInHours`: optional, 1..168 (default 168 = 7 ngày)

**Request:**
```json
{
  "userIds": ["uuid-user-1", "uuid-user-2"],
  "message": "Join our group",
  "expiresInHours": 72
}
```

**Response (S1 - Added skippedDetails):**
```json
{
  "acceptedCount": 2,
  "skippedCount": 1,
  "inviteIds": ["invite-1", "invite-2"],
  "skippedDetails": [
    { "userId": "user-3", "reason": "already_in_group" },
    { "userId": "user-4", "reason": "pending_invite_exists" },
    { "userId": "user-5", "reason": "user_not_found" }
  ]
}
```

**Skip Reasons:**
- `already_in_group`: User đã là thành viên của nhóm
- `pending_invite_exists`: User đã có invite pending cho nhóm này
- `user_not_found`: User không tồn tại trong hệ thống

### 3.3 Get Pending Invites

**Endpoint:** `GET /conversations/invites/pending?page=1&limit=20&status=pending&sort=createdAt:desc`

**Query Params (S2):**
- `page`: page number (default 1)
- `limit`: items per page (default 20, max 100)
- `status`: filter by status (pending, accepted, rejected, cancelled, expired) - default pending
- `sort`: sort order (format: `field:direction`) - default `createdAt:desc`
  - Available fields: `createdAt`, `expiresAt`
  - Available directions: `asc`, `desc`

**Response:**
```json
{
  "items": [
    {
      "id": "invite-id",
      "conversationId": "conversation-id",
      "inviterUserId": "user-id",
      "invitedUserId": "user-id",
      "status": "pending",
      "message": "optional message",
      "expiresAt": "2024-01-01T00:00:00Z",
      "createdAt": "2023-12-25T00:00:00Z",
      "respondedAt": null,
      "conversation": {
        "id": "conversation-id",
        "name": "Group Name",
        "avatarUrl": "public/groups/avatar.png",
        "memberCount": 10
      },
      "inviter": {
        "id": "user-id",
        "fullName": "Inviter Name",
        "avatarUrl": "public/users/avatar.png"
      }
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### 3.4 Get Conversation Invites

**Endpoint:** `GET /conversations/:conversationId/invites?page=1&limit=20&status=pending&sort=createdAt:desc`

**Authorization (S4):**
- Owner: xem tất cả invites
- Admin: xem tất cả invites
- Member: 403 CONVERSATION_PERMISSION_DENIED

**Response:** Same as Get Pending Invites

### 3.5 Accept Invite

**Endpoint:** `POST /conversations/:conversationId/invites/:inviteId/accept`

**Conflict Handling (S3):**
- Nếu user đã trong nhóm (do accept từ nơi khác) → return CONVERSATION_ALREADY_MEMBER
- Nếu 2 admin cùng accept cùng lúc → chỉ 1 thành công, cái kia return GROUP_INVITE_INVALID_STATUS
- Nếu invite đã expired → return GROUP_INVITE_EXPIRED

**Request:** No body

**Response (Success 200):**
```json
{
  "message": "Group invite accepted",
  "conversationId": "conversation-id",
  "status": "accepted",
  "joinedAt": "2024-01-01T00:00:00Z"
}
```

**Response (Already in Group 400):**
```json
{
  "error": "CONVERSATION_ALREADY_MEMBER",
  "message": "You are already a member of this group"
}
```

### 3.6 Reject Invite

**Endpoint:** `POST /conversations/:conversationId/invites/:inviteId/reject`

**Request:** No body

**Response (Success 200):**
```json
{
  "message": "Group invite rejected",
  "status": "rejected",
  "respondedAt": "2024-01-01T00:00:00Z"
}
```

### 3.7 Cancel Invite

**Endpoint:** `POST /conversations/:conversationId/invites/:inviteId/cancel`

**Authorization (S4):**
- Inviter: luôn được cancel
- Owner: được cancel bất kỳ invite nào
- Admin: được cancel khi không phải inviter
- Member: 403 CONVERSATION_PERMISSION_DENIED

**Request:** No body

**Response (Success 200):**
```json
{
  "message": "Group invite cancelled",
  "status": "cancelled"
}
```

**Response (Invalid Status 400):**
```json
{
  "error": "GROUP_INVITE_INVALID_STATUS",
  "message": "Invite is not in a valid state for cancellation"
}
```

## 4. Role & Permission Matrix

### 4.1 Permissions (S7, S8)

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Đổi role | ✅ Tất cả | ❌ Không được đổi admin khác | ❌ Không |
| Giải tan nhóm | ✅ | ❌ | ❌ |
| Thêm thành viên | ✅ | ✅ | ❌ |
| Xóa thành viên | ✅ Tất cả (bao gồm admin) | ✅ Không xóa owner/admin khác | ❌ |
| Gửi invite | ✅ | ✅ | ❌ |
| Hủy invite | ✅ Bất kỳ invite | ✅ Khi không phải inviter | ❌ |
| Xem invite list | ✅ | ✅ | ❌ |
| Rời nhóm | ✅ (với transfer) | ✅ | ✅ |

### 4.2 Special Rules (S6, S8)

**Owner Leave Transfer:**
- Nếu owner leave và có admin: transfer cho admin đầu tiên (sắp xếp theo join time ascending)
- Nếu owner leave và không có admin: transfer cho member đầu tiên (sắp xếp theo join time ascending)
- Nếu owner leave và chỉ có owner: return CONVERSATION_CANNOT_LEAVE

**Disband Behavior:**
- Emit `conversation:disbanded` event cho tất cả members
- Set tất cả active members `leftAt = now`
- Cancel tất cả pending invites
- Mark conversation là disbanded trong DB (không xóa)

**Accept Invite Rejoin:**
- Nếu user đã từng trong nhóm và left trước đó: join lại (leftAt = null)

## 5. Error Code Mapping (S9, S10)

| Error Code | UX Message (Vietnamese) | UX Message (English) | UX Behavior |
|------------|------------------------|---------------------|-------------|
| CONVERSATION_NOT_FOUND | Cuộc trò chuyện không tồn tại | Conversation not found | Show toast, navigate back |
| CONVERSATION_NOT_MEMBER | Bạn không phải thành viên của cuộc trò chuyện này | You are not a member of this conversation | Show toast, navigate back |
| CONVERSATION_PERMISSION_DENIED | Bạn không có quyền thực hiện hành động này | You don't have permission to perform this action | Hide action button, show toast |
| CONVERSATION_MEMBER_NOT_FOUND | Thành viên không tồn tại | Member not found | Show toast, refresh member list |
| CONVERSATION_INVALID_TYPE | Loại cuộc trò chuyện không hợp lệ | Invalid conversation type | Show toast |
| CONVERSATION_ALREADY_MEMBER | Bạn đã là thành viên của cuộc trò chuyện này | You are already a member of this conversation | Show toast, navigate to conversation |
| CONVERSATION_CANNOT_LEAVE | Bạn không thể rời nhóm này | You cannot leave this group | Show toast |
| USER_NOT_FOUND | Người dùng không tồn tại | User not found | Show toast |
| GROUP_INVITE_NOT_FOUND | Lời mời không tồn tại | Invite not found | Show toast, refresh invite list |
| GROUP_INVITE_ALREADY_EXISTS | Lời mời đã tồn tại | Invite already exists | Show toast |
| GROUP_INVITE_EXPIRED | Lời mời đã hết hạn | Invite has expired | Close modal, refresh list, show "Expired" badge |
| GROUP_INVITE_INVALID_STATUS | Lời mời không ở trạng thái hợp lệ. Vui lòng làm mới danh sách | Invite is not in a valid state. Please refresh the list | Show toast, auto refresh invite list |

## 6. Realtime Events

### 6.1 Event List

**Conversation Events:**
- `conversation:created`
- `conversation:updated`
- `conversation:disbanded`
- `conversation:member:added`
- `conversation:member:removed`
- `conversation:member:role:updated`

**Group Invite Events:**
- `group:invite:sent`
- `group:invite:accepted`
- `group:invite:rejected`
- `group:invite:cancelled`
- `group:invite:expired`

### 6.2 Event Behavior (S11-S14)

**conversation:created:**
- Nếu current user trong members: thêm conversation vào list ngay
- Payload: `{ conversationId, type, name, avatarUrl, members[] }`

**conversation:updated:**
- Update name/avatar trong list + detail
- Payload: `{ conversationId, name?, avatarUrl? }`

**conversation:member:added (S11):**
- Nếu `added_user_id` là current user:
  - Thêm conversation vào list
  - Join room UI
  - Clear placeholder state
  - Navigate đến chat screen (nếu đang ở conversation list)
- Nếu thành viên hiện có:
  - Update member list + count
  - Scroll đến bottom (nếu đang ở chat screen)
- Payload: `{ conversationId, addedUserId, addedByUserId, member }`

**conversation:member:removed:**
- Nếu `removed_user_id` là current user:
  - Remove conversation khỏi list active
  - Leave room UI
- Nếu là người khác:
  - Update member list + count
- Payload: `{ conversationId, removedUserId, removedByUserId }`

**conversation:member:role:updated:**
- Nếu `user_id` là current user:
  - Refresh permission UI ngay
  - Update mySettings.role
- Payload: `{ conversationId, userId, oldRole, newRole, updatedByUserId }`

**conversation:disbanded (S12):**
- Remove conversation khỏi UI
- Show notice "Nhóm đã giải tan"
- Nếu đang ở chat screen → navigate về conversation list
- Nếu đang ở conversation list → remove item + show toast
- Payload: `{ conversationId, disbandedByUserId, disbandedAt }`

**group:invite:sent:**
- Nếu `invitedUserId` là current user:
  - Tăng unread badge khu vực "Lời mời vào nhóm"
- Payload: `{ inviteId, conversationId, inviterUserId, invitedUserId, message, expiresAt }`

**group:invite:accepted/rejected/cancelled/expired:**
- Đồng bộ lại invite list (pending và theo conversation)
- Update badge
- Nếu expired: remove expired item khỏi list ngay lập tức (S13)
- Payload: `{ inviteId, conversationId, status, respondedAt? }`

**Idempotency Handling (S14):**
- Merge key: `eventId` (unique trong mỗi WS event)
- Nếu nhận cùng eventId → ignore (đã xử lý)
- Event WS đến sau REST: idempotent merge, không duplicate

## 7. State Management (S15-S17)

### 7.1 conversationDetailStore

**Structure:**
```typescript
{
  [conversationId: string]: {
    conversation: ConversationDetail,
    members: Member[],
    mySettings: { role, nickname, isMuted },
    cachedAt: timestamp
  }
}
```

**Cache TTL:** 5 phút

**Invalidate Triggers:**
- Leave group success
- Disband conversation success
- Member change (added/removed)
- Role change
- Conversation update (name/avatar)

**Sync với conversationListStore:**
- Update name/avatar khi nhận `conversation:updated` event

### 7.2 groupInviteStore

**Structure:**
```typescript
{
  pending: Invite[],
  accepted: Invite[],
  rejected: Invite[],
  cancelled: Invite[],
  expired: Invite[],
  lastFetchedAt: timestamp,
  unreadCount: number
}
```

**Scope:** pending invites only trong main list, history trong separate tab

**Pagination:** client-side, fetch more khi scroll

**Invalidate Triggers:**
- Accept invite success
- Reject invite success
- Cancel invite success
- Expire event received

### 7.3 Request Dedupe (S17)

**Dedupe Key:** `${action}:${conversationId}:${timestamp}`

**Behavior:**
- Nếu 2 requests cùng key → reject cái thứ hai
- TTL của dedupe key: 30 giây

## 8. Data Flow & Partial Failure (S18, S19)

### 8.1 Invite Lifecycle

**Send Invite Flow:**
1. Inviter → BFF → IS → WS → Invitee
2. Nếu WS emit fail → không block API response
3. Nếu WS Gateway down → event sẽ được retry bởi WS Gateway
4. Nếu invitee offline → event sẽ được deliver khi reconnect

**Accept Invite Flow (S19):**
1. Invitee → BFF → IS
2. IS emit `group:invite:accepted` + `conversation:member:added` atomically
3. Nếu một fail → cả hai fail, API response fail
4. Nếu thành công → emit cả hai events

### 8.2 Race Condition Handling

**Accept + Reject cùng lúc:**
- Chỉ 1 request thành công
- Cái kia fail với GROUP_INVITE_INVALID_STATUS
- Force refresh invite list

**2 admin remove cùng member:**
- Chỉ 1 thành công
- Cái kia fail với CONVERSATION_MEMBER_NOT_FOUND
- Force refresh member list

**2 admin change role cùng member:**
- Chỉ 1 thành công (last write wins)
- Cái kia fail với stale state
- Force refresh member list

## 9. Implementation Order

1. **API Layer:** Implement tất cả API endpoints trong conversationsApi.ts
2. **State Management:** Implement groupInviteStore và conversationDetailStore
3. **UI Components:** Implement Invite Center, Invite List, Group Invite Modal
4. **Realtime Events:** Subscribe tất cả 11 events
5. **Error Handling:** Map 12 error codes với UX messages

# ChatOptions - Remove Member Integration Tests

This document describes the integration testing approach for the remove member functionality between Frontend and Backend.

## Backend API Endpoint

### Remove Member
- **Endpoint:** `DELETE /conversations/{conversationId}/members/{memberId}`
- **Method:** DELETE
- **Authentication:** Required (Bearer token)
- **Location:** `Backend/apps/interaction-service/src/modules/conversations/conversations.controller.ts:350-372`

### Backend Permission Logic
```typescript
// Backend: conversation-member.service.ts:185-265
if (userId !== memberId) {
  if (myMembership.role === MEMBER) throw PERMISSION_DENIED;
  if (targetMembership.role === OWNER) throw PERMISSION_DENIED;
  if (myMembership.role === ADMIN && targetMembership.role === ADMIN) 
    throw PERMISSION_DENIED;
}
```

### Frontend API Call
```typescript
// Frontend: conversationsApi.ts:110-114
export const removeMember = (conversationId: string, memberId: string) =>
  request(
    'DELETE',
    `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,
  );
```

## Integration Test Scenarios

### Scenario 1: OWNER removes MEMBER (Success)
**Preconditions:**
- User A is OWNER of conversation CONV-001
- User B is MEMBER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members
3. User A clicks Trash2 icon on User B's row
4. User A confirms removal in dialog

**Expected Backend Response:**
```json
{
  "status": 200,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Expected Frontend Behavior:**
- User B removed from members list immediately (optimistic update)
- Success alert: "Đã xóa thành viên thành công" / "Member removed successfully"
- Kafka event emitted: `ConversationMemberRemoved`
- Cache invalidated for all group members

---

### Scenario 2: ADMIN removes MEMBER (Success)
**Preconditions:**
- User A is ADMIN of conversation CONV-001
- User B is MEMBER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members
3. User A clicks Trash2 icon on User B's row
4. User A confirms removal in dialog

**Expected Backend Response:**
```json
{
  "status": 200,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Expected Frontend Behavior:**
- User B removed from members list immediately
- Success alert appears
- Kafka event emitted

---

### Scenario 3: MEMBER attempts to remove MEMBER (Failure - Permission Denied)
**Preconditions:**
- User A is MEMBER of conversation CONV-001
- User B is MEMBER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members

**Expected Frontend Behavior:**
- Trash2 icon should NOT be visible for any member
- Remove button hidden (permission check at UI level)

**Expected Backend Response (if bypassed):**
```json
{
  "status": 403,
  "error": "CONVERSATION_PERMISSION_DENIED"
}
```

---

### Scenario 4: ADMIN attempts to remove OWNER (Failure - Permission Denied)
**Preconditions:**
- User A is ADMIN of conversation CONV-001
- User B is OWNER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members

**Expected Frontend Behavior:**
- Trash2 icon should NOT be visible for User B (OWNER)
- Remove button hidden (permission check: `!isOtherOwner`)

**Expected Backend Response (if bypassed):**
```json
{
  "status": 403,
  "error": "CONVERSATION_PERMISSION_DENIED"
}
```

---

### Scenario 5: ADMIN attempts to remove another ADMIN (Failure - Permission Denied)
**Preconditions:**
- User A is ADMIN of conversation CONV-001
- User B is ADMIN of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members

**Expected Frontend Behavior:**
- Trash2 icon should NOT be visible for User B (ADMIN)
- Remove button hidden (permission check: `item.role === 'member'` only)

**Expected Backend Response (if bypassed):**
```json
{
  "status": 403,
  "error": "CONVERSATION_PERMISSION_DENIED"
}
```

---

### Scenario 6: OWNER attempts to remove another OWNER (Failure - Permission Denied)
**Preconditions:**
- User A is OWNER of conversation CONV-001
- User B is OWNER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members

**Expected Frontend Behavior:**
- Trash2 icon should NOT be visible for User B (OWNER)
- Remove button hidden (permission check: `!isOtherOwner`)

**Expected Backend Response (if bypassed):**
```json
{
  "status": 403,
  "error": "CONVERSATION_PERMISSION_DENIED"
}
```

---

### Scenario 7: Remove non-existent member (Failure - Not Found)
**Preconditions:**
- User A is OWNER of conversation CONV-001
- User B is NOT a member of CONV-001

**Steps:**
1. User A attempts to remove User B (via API call)

**Expected Backend Response:**
```json
{
  "status": 404,
  "error": "CONVERSATION_MEMBER_NOT_FOUND"
}
```

**Expected Frontend Behavior:**
- Error alert: "Không thể xóa thành viên" / "Failed to remove member"
- Member list unchanged

---

### Scenario 8: Remove member in DIRECT conversation (Failure - Invalid Type)
**Preconditions:**
- User A is in DIRECT conversation with User B

**Steps:**
1. User A attempts to remove User B

**Expected Backend Response:**
```json
{
  "status": 400,
  "error": "CONVERSATION_INVALID_TYPE"
}
```

**Expected Frontend Behavior:**
- UI should not show remove option for direct conversations
- Group members option should not be available

---

### Scenario 9: Network Error (Failure)
**Preconditions:**
- User A is OWNER of conversation CONV-001
- User B is MEMBER of conversation CONV-001
- Network is offline or backend is down

**Steps:**
1. User A clicks Trash2 icon on User B's row
2. User A confirms removal

**Expected Frontend Behavior:**
- Loading state shown (optional)
- Error alert with backend error message
- Member remains in list (optimistic update should be rolled back)

---

### Scenario 10: Self removal (Not allowed via remove button)
**Preconditions:**
- User A is OWNER/ADMIN/MEMBER of conversation CONV-001

**Steps:**
1. User A opens Chat Options for CONV-001
2. User A navigates to Group Members

**Expected Frontend Behavior:**
- Trash2 icon should NOT be visible for User A's own row
- Permission check: `!isSelf`
- Self-removal should use "Leave Group" option instead

---

## Manual Integration Testing Steps

### Prerequisites
1. Backend is running and accessible
2. Database has test data with:
   - At least 1 OWNER
   - At least 1 ADMIN
   - At least 2 MEMBERS
   - Group conversation with all roles

### Test Environment Setup
```bash
# Start Backend
cd Backend
npm run start:dev

# Start Frontend
cd Frontend_mobile
npm start
```

### Test Execution

#### Step 1: Verify API Endpoint
```bash
# Test remove member as OWNER
curl -X DELETE \
  http://localhost:3000/conversations/{convId}/members/{memberId} \
  -H "Authorization: Bearer {ownerToken}"

# Expected: 200 OK
```

#### Step 2: Verify Frontend-Backend Permission Sync
1. Login as OWNER
2. Navigate to group with members
3. Verify Trash2 icon shows for: ADMIN, MEMBER
4. Verify Trash2 icon hidden for: OWNER, self
5. Click remove on MEMBER → verify success
6. Check backend database → member should have `leftAt` set

#### Step 3: Verify Admin Permission
1. Login as ADMIN (not owner)
2. Navigate to same group
3. Verify Trash2 icon shows for: MEMBER only
4. Verify Trash2 icon hidden for: OWNER, ADMIN, self
5. Click remove on MEMBER → verify success
6. Check backend database → member should have `leftAt` set

#### Step 4: Verify Member Permission
1. Login as MEMBER
2. Navigate to same group
3. Verify NO Trash2 icons visible
4. Verify no remove option available

#### Step 5: Verify Error Handling
1. Simulate network error (disconnect backend)
2. Attempt to remove member
3. Verify error alert shows
4. Verify member not removed from list

#### Step 6: Verify Kafka Events
1. Enable Kafka consumer logs
2. Remove a member
3. Verify `ConversationMemberRemoved` event is emitted with:
   - conversation_id
   - removed_by
   - removed_user_id
   - removed_at
   - trace_id

#### Step 7: Verify Cache Invalidation
1. Check Redis cache for conversation members before removal
2. Remove a member
3. Verify cache is invalidated
4. Verify next fetch gets fresh data

---

## Permission Matrix Verification

| My Role | Target Role | Frontend Icon | Backend API | Expected Result |
|---------|-------------|---------------|-------------|-----------------|
| OWNER | MEMBER | ✅ Visible | ✅ Allowed | Success |
| OWNER | ADMIN | ✅ Visible | ✅ Allowed | Success |
| OWNER | OWNER (other) | ❌ Hidden | ❌ Forbidden | UI prevents |
| OWNER | Self | ❌ Hidden | ❌ Forbidden | UI prevents |
| ADMIN | MEMBER | ✅ Visible | ✅ Allowed | Success |
| ADMIN | ADMIN (other) | ❌ Hidden | ❌ Forbidden | UI prevents |
| ADMIN | OWNER | ❌ Hidden | ❌ Forbidden | UI prevents |
| ADMIN | Self | ❌ Hidden | ❌ Forbidden | UI prevents |
| MEMBER | Anyone | ❌ Hidden | ❌ Forbidden | UI prevents |

---

## Known Limitations & Edge Cases

1. **Race Condition:** If two users try to remove the same member simultaneously
   - Backend uses transaction for member removal
   - Frontend uses optimistic update
   - Should handle gracefully with retry

2. **Last Owner:** If there's only 1 owner and they leave
   - Backend `leaveConversation` handles owner transfer
   - Remove member doesn't apply to owner leaving
   - Need to verify owner transfer logic

3. **Group Disband:** If owner removes all members
   - Backend doesn't auto-disband on member removal
   - Owner can use "Delete Group" option
   - Verify group remains with 1 member (owner)

4. **Large Groups:** Performance with 100+ members
   - Frontend uses FlatList for efficient rendering
   - Backend uses pagination for member list
   - Verify smooth scrolling with remove action

---

## Test Data Setup Script

```sql
-- Create test conversation with multiple roles
INSERT INTO conversations (id, name, type, created_by_id) 
VALUES ('test-conv-001', 'Test Group', 'GROUP', 'owner-user-id');

-- Add members with different roles
INSERT INTO conversation_members (conversation_id, user_id, role) 
VALUES 
  ('test-conv-001', 'owner-user-id', 'owner'),
  ('test-conv-001', 'admin-user-id', 'admin'),
  ('test-conv-001', 'member-user-id-1', 'member'),
  ('test-conv-001', 'member-user-id-2', 'member');
```

---

## Success Criteria

Integration testing is successful when:
- ✅ All 10 scenarios pass
- ✅ Frontend permission matches Backend permission exactly
- ✅ Error messages are user-friendly
- ✅ Optimistic updates work correctly
- ✅ Kafka events are emitted correctly
- ✅ Cache invalidation works
- ✅ No TypeScript errors
- ✅ No runtime errors in console

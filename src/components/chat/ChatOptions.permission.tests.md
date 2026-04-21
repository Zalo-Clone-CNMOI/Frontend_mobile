# ChatOptions - Remove Member Permission Tests

This document describes the test cases for the remove member permission logic in ChatOptions.tsx.

## Permission Logic

```typescript
const canRemoveMember = (iAmOwner && !isSelf && !isOtherOwner) ||
                        (iAmAdmin && !isSelf && item.role === 'member');
```

## Test Cases

### FE-01: OWNER sees remove button for MEMBER
**Input:**
- myRole = 'owner'
- item.role = 'member'
- isSelf = false
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = true
- Trash2 icon is visible

---

### FE-02: OWNER sees remove button for ADMIN
**Input:**
- myRole = 'owner'
- item.role = 'admin'
- isSelf = false
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = true
- Trash2 icon is visible

---

### FE-03: OWNER does NOT see remove button for other OWNER
**Input:**
- myRole = 'owner'
- item.role = 'owner'
- isSelf = false
- isOtherOwner = true

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

### FE-04: OWNER does NOT see remove button for self
**Input:**
- myRole = 'owner'
- item.role = 'owner'
- isSelf = true
- isOtherOwner = true

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

### FE-05: ADMIN sees remove button for MEMBER
**Input:**
- myRole = 'admin'
- item.role = 'member'
- isSelf = false
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = true
- Trash2 icon is visible

---

### FE-06: ADMIN does NOT see remove button for other ADMIN
**Input:**
- myRole = 'admin'
- item.role = 'admin'
- isSelf = false
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

### FE-07: ADMIN does NOT see remove button for OWNER
**Input:**
- myRole = 'admin'
- item.role = 'owner'
- isSelf = false
- isOtherOwner = true

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

### FE-08: MEMBER does NOT see remove button for others
**Input:**
- myRole = 'member'
- item.role = 'member'
- isSelf = false
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

### FE-09: MEMBER does NOT see remove button for self
**Input:**
- myRole = 'member'
- item.role = 'member'
- isSelf = true
- isOtherOwner = false

**Expected Output:**
- canRemoveMember = false
- Trash2 icon is NOT visible

---

## Manual Testing Checklist

To verify the implementation manually:

1. **Test as OWNER:**
   - [ ] Create a group as owner
   - [ ] Add a MEMBER - verify remove button is visible
   - [ ] Add an ADMIN - verify remove button is visible
   - [ ] Add another OWNER - verify remove button is NOT visible
   - [ ] Check your own row - verify remove button is NOT visible
   - [ ] Click remove button on MEMBER - verify confirmation dialog appears
   - [ ] Confirm removal - verify member is removed from list
   - [ ] Verify success alert appears

2. **Test as ADMIN:**
   - [ ] Join a group as admin (not owner)
   - [ ] Find a MEMBER - verify remove button is visible
   - [ ] Find another ADMIN - verify remove button is NOT visible
   - [ ] Find the OWNER - verify remove button is NOT visible
   - [ ] Check your own row - verify remove button is NOT visible
   - [ ] Click remove button on MEMBER - verify confirmation dialog appears
   - [ ] Confirm removal - verify member is removed from list
   - [ ] Verify success alert appears

3. **Test as MEMBER:**
   - [ ] Join a group as regular member
   - [ ] Check all members - verify NO remove buttons are visible
   - [ ] Verify you cannot remove anyone

4. **Test Error Handling:**
   - [ ] Try to remove member while offline - verify error alert appears
   - [ ] Try to remove member when backend rejects - verify error alert appears
   - [ ] Verify error message is clear and user-friendly

5. **Test UI/UX:**
   - [ ] Verify Trash2 icon has correct color (#FF3B30)
   - [ ] Verify icon has proper hit area (10px padding)
   - [ ] Verify confirmation dialog shows member name
   - [ ] Verify cancel button works
   - [ ] Verify optimistic UI update (member disappears immediately)

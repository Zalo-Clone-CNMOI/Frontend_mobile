import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { removeMember, updateMember } from '@/src/services/conversationsApi';

const EMPTY_MEMBERS: any[] = [];

export interface Member {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  nickname?: string | null;
}

export const useGroupMembers = (conversationId: string, myRole: 'owner' | 'admin' | 'member', currentUserId: string) => {
  const cacheEntry = useConversationDetailStore(
    (state) => state.cache[conversationId]
  );
  const members = useMemo(() => cacheEntry?.members || EMPTY_MEMBERS, [cacheEntry]);
  const storeFetchConversationDetail = useConversationDetailStore(
    (state) => state.fetchConversationDetail
  );
  const storeUpdateMember = useConversationDetailStore(
    (state) => state.updateMember
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [localRoleUpdates, setLocalRoleUpdates] = useState<Record<string, 'admin' | 'member'>>({});
  const [pendingRollback, setPendingRollback] = useState<Record<string, 'owner' | 'admin' | 'member'>>({});

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Role selection modal state
  const [roleSelectionVisible, setRoleSelectionVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [roleUpdating, setRoleUpdating] = useState(false);
  
  // Individual action loading states
  const [removingMemberIds, setRemovingMemberIds] = useState<Set<string>>(new Set());

  // Cast members to proper type + apply local optimistic updates
  const typedMembers = useMemo(() => {
    const baseMembers = (members || []) as Member[];
    return baseMembers.map(m => ({
      ...m,
      role: localRoleUpdates[m.userId] || m.role,
    }));
  }, [members, localRoleUpdates]);

  const filteredMembers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return typedMembers;
    const query = debouncedSearchQuery.toLowerCase().trim();
    return typedMembers.filter((m) =>
      (m.fullName || '').toLowerCase().includes(query) ||
      (m.nickname || '').toLowerCase().includes(query)
    );
  }, [typedMembers, debouncedSearchQuery]);

  const refreshMembers = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      await storeFetchConversationDetail(conversationId, true);
    } catch (error) {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [conversationId, storeFetchConversationDetail]);

  const handleRemoveMember = useCallback(async (item: Member) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';

    const canRemove = (iAmOwner && !isSelf && !isOtherOwner) ||
                      (iAmAdmin && !isSelf && item.role === 'member');

    if (!canRemove) {
      return { success: false, reason: 'no_permission' };
    }

    // Set loading state for this member
    setRemovingMemberIds(prev => new Set(prev).add(item.userId));

    try {
      await removeMember(conversationId, item.userId);
      refreshMembers();
      return { success: true };
    } catch (error: any) {
      return { success: false, reason: error.message };
    } finally {
      // Clear loading state for this member
      setRemovingMemberIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.userId);
        return newSet;
      });
    }
  }, [conversationId, myRole, currentUserId, refreshMembers]);

  const handleRoleChange = useCallback((item: Member) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';

    const canChangeRole = iAmOwner && !isSelf && !isOtherOwner;

    if (!canChangeRole) {
      return false;
    }

    setSelectedMember(item);
    setSelectedRole(item.role === 'admin' ? 'admin' : 'member');
    setRoleSelectionVisible(true);
    return true;
  }, [myRole, currentUserId]);

  const handleCloseRoleSelection = useCallback(() => {
    setRoleSelectionVisible(false);
    setSelectedMember(null);
    setSelectedRole('member');
  }, []);

  const handleConfirmRoleChange = useCallback(async () => {
    if (!selectedMember) return;

    const previousRole = selectedMember.role;
    const newRole = selectedRole;

    // Check admin limit (max 5 admins)
    if (newRole === 'admin') {
      const currentAdminCount = typedMembers.filter(
        m => m.role === 'admin' || m.userId === selectedMember.userId
      ).length;
      
      if (currentAdminCount >= 5) {
        return { success: false, reason: 'Maximum 5 admins allowed' };
      }
    }

    setRoleUpdating(true);
    
    // Store previous role for potential rollback
    setPendingRollback(prev => ({
      ...prev,
      [selectedMember.userId]: previousRole,
    }));

    try {
      await updateMember(conversationId, selectedMember.userId, { role: newRole });

      // Optimistic update
      setLocalRoleUpdates(prev => ({
        ...prev,
        [selectedMember.userId]: newRole,
      }));

      storeUpdateMember(conversationId, selectedMember.userId, { role: newRole });

      handleCloseRoleSelection();

      // Clear local update after background sync
      setTimeout(() => {
        setLocalRoleUpdates(prev => {
          const { [selectedMember.userId]: _, ...rest } = prev;
          return rest;
        });
      }, 3000);

      // Clear pending rollback on success
      setPendingRollback(prev => {
        const { [selectedMember.userId]: _, ...rest } = prev;
        return rest;
      });

      // Background refresh
      setTimeout(async () => {
        try {
          await refreshMembers();
        } catch {
          // Silent fail
        }
      }, 500);

      return { success: true };
    } catch (error: any) {
      // Rollback optimistic update on failure
      setLocalRoleUpdates(prev => {
        const { [selectedMember.userId]: _, ...rest } = prev;
        return rest;
      });

      // Clear pending rollback
      setPendingRollback(prev => {
        const { [selectedMember.userId]: _, ...rest } = prev;
        return rest;
      });

      return { success: false, reason: error.message };
    } finally {
      setRoleUpdating(false);
    }
  }, [selectedMember, conversationId, storeUpdateMember, handleCloseRoleSelection, refreshMembers]);

  const checkPermissions = useCallback((item: Member) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';

    const canChangeRole = iAmOwner && !isSelf && !isOtherOwner;
    const canRemove = (iAmOwner && !isSelf && !isOtherOwner) ||
                      (iAmAdmin && !isSelf && item.role === 'member');

    return { canChangeRole, canRemove };
  }, [myRole, currentUserId]);

  return {
    members: typedMembers,
    filteredMembers,
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery,
    loading,
    roleSelectionVisible,
    selectedMember,
    selectedRole,
    setSelectedRole,
    roleUpdating,
    removingMemberIds,
    handleRemoveMember,
    handleRoleChange,
    handleCloseRoleSelection,
    handleConfirmRoleChange,
    checkPermissions,
    refreshMembers,
  };
};

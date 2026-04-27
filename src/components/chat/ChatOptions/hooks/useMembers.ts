import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { updateMember, removeMember } from '@/src/services/conversationsApi';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';

interface Member {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  nickname?: string;
}

interface UseMembersOptions {
  chatId: string;
  currentUserId?: string;
  myRole: 'owner' | 'admin' | 'member';
}

interface UseMembersReturn {
  selectedMember: Member | null;
  selectedRole: 'admin' | 'member';
  roleUpdating: boolean;
  setSelectedMember: (member: Member | null) => void;
  setSelectedRole: (role: 'admin' | 'member') => void;
  handleRoleChangeConfirm: () => Promise<void>;
  handleRemoveMember: (member: Member) => void;
  canChangeRole: (member: Member) => boolean;
  canRemoveMember: (member: Member) => boolean;
}

export const useMembers = ({
  chatId,
  currentUserId,
  myRole,
}: UseMembersOptions): UseMembersReturn => {
  const { t } = useTranslation();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const refreshConversationDetails = useConversationDetailStore(
    (state) => state.fetchConversationDetail
  );

  const canChangeRole = useCallback(
    (member: Member): boolean => {
      const isSelf = member.userId === currentUserId;
      const isOtherOwner = member.role === 'owner';
      const iAmOwner = myRole === 'owner';
      return iAmOwner && !isSelf && !isOtherOwner;
    },
    [currentUserId, myRole]
  );

  const canRemoveMember = useCallback(
    (member: Member): boolean => {
      const isSelf = member.userId === currentUserId;
      const isOtherOwner = member.role === 'owner';
      const iAmOwner = myRole === 'owner';
      const iAmAdmin = myRole === 'admin';

      if (iAmOwner && !isSelf && !isOtherOwner) return true;
      if (iAmAdmin && !isSelf && member.role === 'member') return true;
      return false;
    },
    [currentUserId, myRole]
  );

  const handleRoleChangeConfirm = useCallback(async () => {
    if (!selectedMember) return;

    setRoleUpdating(true);
    try {
      await updateMember(chatId, selectedMember.userId, { role: selectedRole });
      Alert.alert(t('common.success'), t('member_role.role_updated'));
      await refreshConversationDetails(chatId, true);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setRoleUpdating(false);
      setSelectedMember(null);
    }
  }, [selectedMember, selectedRole, chatId, refreshConversationDetails, t]);

  const handleRemoveMember = useCallback(
    (member: Member) => {
      Alert.alert(
        t('chat_options.remove_member'),
        t('chat_options.remove_member_confirm', { name: member.fullName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('chat_options.remove'),
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember(chatId, member.userId);
                Alert.alert(t('common.success'), t('chat_options.remove_member_success'));
              } catch (error: any) {
                Alert.alert(
                  t('common.error'),
                  error.message || t('chat_options.remove_member_failed')
                );
              }
            },
          },
        ]
      );
    },
    [chatId, t]
  );

  return {
    selectedMember,
    selectedRole,
    roleUpdating,
    setSelectedMember,
    setSelectedRole,
    handleRoleChangeConfirm,
    handleRemoveMember,
    canChangeRole,
    canRemoveMember,
  };
};

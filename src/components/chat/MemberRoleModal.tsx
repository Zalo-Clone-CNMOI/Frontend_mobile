import { useTheme } from '@/src/theme/themeContext';
import { Shield, ShieldCheck, ShieldAlert, Trash2, X, Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { updateMember, removeMember } from '@/src/services/conversationsApi';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';

type MemberRole = 'owner' | 'admin' | 'member';

interface Member {
  id: string;
  userId: string;
  fullName: string;
  role: MemberRole;
  avatarUrl?: string;
  nickname?: string;
}

interface MemberRoleModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  members: Member[];
  currentUserId: string;
}

// ===== Pure permission functions (simple, testable) =====
const canUpdateMemberRole = (
  myRole: MemberRole | undefined,
  memberRole: MemberRole | undefined,
  isSelf: boolean
): boolean => {
  if (!myRole || !memberRole) return false;
  if (isSelf) return false;
  // Only owner can change roles
  if (myRole === 'owner') {
    return memberRole === 'admin' || memberRole === 'member';
  }
  return false;
};

const canRemoveMember = (
  myRole: MemberRole | undefined,
  memberRole: MemberRole | undefined,
  isSelf: boolean
): boolean => {
  if (!myRole || !memberRole) return false;
  if (isSelf) return false;

  if (myRole === 'owner') {
    return memberRole === 'admin' || memberRole === 'member';
  }
  if (myRole === 'admin') {
    return memberRole === 'member';
  }
  return false;
};

export function MemberRoleModal({
  visible,
  onClose,
  conversationId,
  members,
  currentUserId,
}: MemberRoleModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [roleSelectionVisible, setRoleSelectionVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('member');

  // Get my role using unified getMyRole (members[] first, fallback mySettings)
  const getMyRole = useConversationDetailStore((s) => s.getMyRole);
  const myRole = getMyRole(conversationId, currentUserId);

  const isGroupOwner = myRole === 'owner';
  const isGroupAdmin = myRole === 'admin';

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return <ShieldCheck size={20} color={theme.colors.primary} />;
      case 'admin':
        return <Shield size={20} color="#FF9500" />;
      default:
        return <ShieldAlert size={20} color={theme.colors.icon} />;
    }
  };

  const getRoleLabel = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return t('member_role.owner');
      case 'admin':
        return t('member_role.admin');
      default:
        return t('member_role.member');
    }
  };

  // Helper to check permissions using pure functions
  const memberCanChangeRole = (member: Member) =>
    canUpdateMemberRole(myRole, member.role, member.userId === currentUserId);

  const memberCanBeRemoved = (member: Member) =>
    canRemoveMember(myRole, member.role, member.userId === currentUserId);

  const handleRoleChange = async (member: Member, newRole: MemberRole) => {
    if (member.role === newRole) return;

    setLoading(true);
    try {
      await updateMember(conversationId, member.userId, { role: newRole });
      Alert.alert(t('common.success'), t('member_role.role_updated'));

      // Store will be automatically updated via socket event (conversation:member:role:updated)
      // No need to manually fetch - component re-renders when store updates

      onClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    Alert.alert(
      t('member_role.remove_confirm'),
      t('member_role.remove_confirm_message', { name: member.nickname || member.fullName }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('member_role.remove'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await removeMember(conversationId, member.userId);
              Alert.alert(t('common.success'), t('member_role.remove_success'));
              onClose();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('member_role.remove_failed'));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const showRoleOptions = (member: Member) => {
    if (!memberCanChangeRole(member)) return;

    setSelectedMember(member);
    setSelectedRole(member.role);
    setRoleSelectionVisible(true);
  };

  const handleRoleSelectionConfirm = async () => {
    if (!selectedMember) return;

    if (selectedMember.role === selectedRole) {
      setRoleSelectionVisible(false);
      return;
    }

    setLoading(true);
    try {
      await updateMember(conversationId, selectedMember.userId, { role: selectedRole });
      Alert.alert(t('common.success'), t('member_role.role_updated'));
      setRoleSelectionVisible(false);
      onClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('member_role.manage_roles')}
              </Text>
            </View>

            <View style={styles.content}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberItem,
                    {
                      backgroundColor: theme.colors.background,
                      borderBottomColor: theme.colors.border,
                      opacity: memberCanChangeRole(member) || memberCanBeRemoved(member) ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => showRoleOptions(member)}
                  disabled={!memberCanChangeRole(member) || loading}
                >
                  <View style={styles.memberInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                        {(member.nickname || member.fullName).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={[styles.memberName, { color: theme.colors.text }]}>
                        {member.nickname || member.fullName}
                      </Text>
                      <View style={styles.roleContainer}>
                        {getRoleIcon(member.role)}
                        <Text style={[styles.roleText, { color: theme.colors.icon }]}>
                          {getRoleLabel(member.role)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.actionsContainer}>
                    {memberCanChangeRole(member) && (
                      <Text style={[styles.changeText, { color: theme.colors.primary }]}>
                        {t('member_role.change')}
                      </Text>
                    )}
                    {memberCanBeRemoved(member) && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member);
                        }}
                        disabled={loading}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Role Selection Modal */}
      <Modal
        transparent
        visible={roleSelectionVisible}
        animationType="fade"
        onRequestClose={() => setRoleSelectionVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRoleSelectionVisible(false)}>
          <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('member_role.change_role_for', { name: selectedMember?.nickname || selectedMember?.fullName })}
              </Text>
              <TouchableOpacity onPress={() => setRoleSelectionVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {(['admin', 'member'] as MemberRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: selectedRole === role ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole(role)}
                  disabled={loading}
                >
                  <View style={styles.roleOptionLeft}>
                    {getRoleIcon(role)}
                    <Text style={[styles.roleOptionText, { color: theme.colors.text }]}>
                      {getRoleLabel(role)}
                    </Text>
                  </View>
                  {selectedRole === role && (
                    <View style={[styles.radioButton, { backgroundColor: theme.colors.primary }]}>
                      <Check size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setRoleSelectionVisible(false)}
                disabled={loading}
              >
                <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.5 : 1 }]}
                onPress={handleRoleSelectionConfirm}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.saveText}>{t('common.saving')}</Text>
                ) : (
                  <Text style={styles.saveText}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 13,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 8,
  },
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

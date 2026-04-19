import { useTheme } from '@/src/theme/themeContext';
import { Shield, ShieldCheck, ShieldAlert, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { updateMember } from '@/src/services/conversationsApi';

type MemberRole = 'owner' | 'admin' | 'member';

interface Member {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  role: MemberRole;
}

interface MemberRoleModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}

export function MemberRoleModal({
  visible,
  onClose,
  conversationId,
  members,
  currentUserId,
  isOwner,
}: MemberRoleModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

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

  const canChangeRole = (member: Member) => {
    // Only owner can change roles
    if (!isOwner) return false;
    // Cannot change own role
    if (member.userId === currentUserId) return false;
    // Cannot change other owners
    if (member.role === 'owner') return false;
    return true;
  };

  const handleRoleChange = async (member: Member, newRole: MemberRole) => {
    if (member.role === newRole) return;

    setLoading(true);
    try {
      await updateMember(conversationId, member.userId, { role: newRole });
      Alert.alert(t('common.success'), t('member_role.role_updated'));
      onClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setLoading(false);
    }
  };

  const showRoleOptions = (member: Member) => {
    if (!canChangeRole(member)) return;

    const options: MemberRole[] = ['admin', 'member'];
    const currentRoleIndex = options.indexOf(member.role as MemberRole);

    Alert.alert(
      t('member_role.change_role_for', { name: member.fullName }),
      '',
      [
        {
          text: getRoleLabel('admin'),
          onPress: () => handleRoleChange(member, 'admin'),
        },
        {
          text: getRoleLabel('member'),
          onPress: () => handleRoleChange(member, 'member'),
          style: 'destructive',
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ],
    );
  };

  return (
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
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
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
                    opacity: canChangeRole(member) ? 1 : 0.6,
                  },
                ]}
                onPress={() => showRoleOptions(member)}
                disabled={!canChangeRole(member) || loading}
              >
                <View style={styles.memberInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                      {member.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>
                      {member.fullName}
                    </Text>
                    <View style={styles.roleContainer}>
                      {getRoleIcon(member.role)}
                      <Text style={[styles.roleText, { color: theme.colors.icon }]}>
                        {getRoleLabel(member.role)}
                      </Text>
                    </View>
                  </View>
                </View>
                {canChangeRole(member) && (
                  <Text style={[styles.changeText, { color: theme.colors.primary }]}>
                    {t('member_role.change')}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
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
});

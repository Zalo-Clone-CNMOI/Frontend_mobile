import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, Shield, ShieldAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Member } from '../hooks/useGroupMembers';
import { styles } from '../styles';
import { type AppTheme } from '@/src/theme/themeManager';

interface RoleSelectionModalProps {
  visible: boolean;
  selectedMember: Member | null;
  selectedRole: 'admin' | 'member';
  onRoleChange: (role: 'admin' | 'member') => void;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; reason?: string }>;
  isUpdating: boolean;
  theme: AppTheme;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  visible,
  selectedMember,
  selectedRole,
  onRoleChange,
  onClose,
  onConfirm,
  isUpdating,
  theme,
}) => {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    const result = await onConfirm();
    if (!result.success) {
      Alert.alert(t('common.error'), result.reason || t('member_role.update_failed'));
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.roleSelectionContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.roleSelectionHeader}>
            <Text style={[styles.roleSelectionTitle, { color: theme.colors.text }]}>
              {t('member_role.change_role_for', { name: selectedMember?.fullName })}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.roleSelectionContent}>
            {(['admin', 'member'] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  selectedRole === role && { backgroundColor: theme.colors.primary + '10' },
                ]}
                onPress={() => onRoleChange(role)}
              >
                <View style={[styles.roleIconContainer, { backgroundColor: role === 'admin' ? '#FF9500' : theme.colors.icon }]}>
                  {role === 'admin' ? (
                    <Shield size={20} color="#fff" />
                  ) : (
                    <ShieldAlert size={20} color="#fff" />
                  )}
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[styles.roleOptionTitle, { color: theme.colors.text }]}>
                    {role === 'admin' ? t('chat_options.role_admin') : t('chat_options.role_member')}
                  </Text>
                  <Text style={[styles.roleOptionDescription, { color: theme.colors.icon }]}>
                    {role === 'admin'
                      ? t('member_role.admin_description')
                      : t('member_role.member_description')}
                  </Text>
                </View>
                {selectedRole === role && (
                  <View style={[styles.checkContainer, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.roleSelectionFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.colors.primary, opacity: isUpdating ? 0.5 : 1 }
              ]}
              onPress={handleConfirm}
              disabled={isUpdating}
            >
              <Text style={styles.saveText}>
                {isUpdating ? t('common.updating') : t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

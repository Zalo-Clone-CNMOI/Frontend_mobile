import { Check, Shield, ShieldAlert, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../styles';

interface RoleSelectionModalProps {
  visible: boolean;
  theme: any;
  selectedRole: 'admin' | 'member';
  roleUpdating: boolean;
  memberName: string;
  onClose: () => void;
  onRoleChange: (role: 'admin' | 'member') => void;
  onConfirm: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  visible,
  theme,
  selectedRole,
  roleUpdating,
  memberName,
  onClose,
  onRoleChange,
  onConfirm,
}) => {
  const { t } = useTranslation();

  const roles: Array<{ value: 'admin' | 'member'; icon: typeof Shield; color: string }> = [
    { value: 'admin', icon: Shield, color: '#FF9500' },
    { value: 'member', icon: ShieldAlert, color: theme.colors.icon },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.roleSelectionContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.roleSelectionHeader}>
            <Text style={[styles.roleSelectionTitle, { color: theme.colors.text }]}>
              {t('member_role.change_role_for', { name: memberName })}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={roleUpdating}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.roleSelectionContent}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleOption,
                  { backgroundColor: theme.colors.background },
                ]}
                onPress={() => onRoleChange(role.value)}
              >
                <View style={styles.roleOptionLeft}>
                  <View
                    style={[
                      styles.roleIconContainer,
                      { backgroundColor: role.color + '20' },
                    ]}
                  >
                    <role.icon size={20} color={role.color} />
                  </View>
                  <Text style={[styles.roleOptionText, { color: theme.colors.text }]}>
                    {role.value === 'admin' ? t('member_role.admin') : t('member_role.member')}
                  </Text>
                </View>
                {selectedRole === role.value && (
                  <View
                    style={[styles.radioButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <Check size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.roleSelectionFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={roleUpdating}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.colors.primary, opacity: roleUpdating ? 0.5 : 1 },
              ]}
              onPress={onConfirm}
              disabled={roleUpdating}
            >
              {roleUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

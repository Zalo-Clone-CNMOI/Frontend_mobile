import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crown, Shield, ShieldAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import { type AppTheme } from '@/src/theme/themeManager';

interface RoleBadgeProps {
  role: 'owner' | 'admin' | 'member';
  theme: AppTheme;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, theme }) => {
  const { t } = useTranslation();

  if (role === 'owner') {
    return (
      <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '20' }]}>
        <Crown size={12} color={theme.colors.primary} />
        <Text style={[styles.roleText, { color: theme.colors.primary }]}>{t('chat_options.role_owner')}</Text>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={[styles.roleBadge, { backgroundColor: '#FF9500' + '20' }]}>
        <Shield size={12} color="#FF9500" />
        <Text style={[styles.roleText, { color: '#FF9500' }]}>{t('chat_options.role_admin')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.roleBadge, { backgroundColor: theme.colors.icon + '20' }]}>
      <ShieldAlert size={12} color={theme.colors.icon} />
      <Text style={[styles.roleText, { color: theme.colors.icon }]}>{t('chat_options.role_member')}</Text>
    </View>
  );
};

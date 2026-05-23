import React from 'react';
import { AlertCircle, Clock, Link2Off, Shield, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { normalizeGroupSettings } from '../../types/group-settings';
import { useConversationDetailStore } from '../../store/useConversationDetailStore';

interface PolicyStatusBannerProps {
  conversationId: string;
  theme: any;
  myRole: 'owner' | 'admin' | 'member';
}

interface PolicyItem {
  key: 'join_approval' | 'allow_read_history' | 'allow_join_link';
  icon: React.ReactNode;
  getMessage: (value: boolean, t: any) => string;
}

export const PolicyStatusBanner: React.FC<PolicyStatusBannerProps> = ({
  conversationId,
  theme,
  myRole,
}) => {
  const { t } = useTranslation();
  const settings = useConversationDetailStore((state) => state.getSettings(conversationId));
  const currentSettings = normalizeGroupSettings(settings);

  const policies: PolicyItem[] = [
    {
      key: 'join_approval',
      icon: <Users size={16} color={theme.colors.warning || '#FF9500'} />,
      getMessage: (value, t) => value
        ? t('policies.join_approval_true') || 'Nhóm yêu cầu phê duyệt để tham gia'
        : t('policies.join_approval_false') || 'Không yêu cầu phê duyệt để tham gia',
    },
    {
      key: 'allow_read_history',
      icon: <Clock size={16} color={theme.colors.warning || '#FF9500'} />,
      getMessage: (value, t) => value
        ? t('policies.allow_read_history_true') || 'Thành viên mới có thể đọc lịch sử'
        : t('policies.allow_read_history_false') || 'Tin nhắn cũ không khả dụng cho thành viên mới',
    },
    {
      key: 'allow_join_link',
      icon: <Link2Off size={16} color={theme.colors.warning || '#FF9500'} />,
      getMessage: (value, t) => value
        ? t('policies.allow_join_link_true') || 'Có thể tham gia nhóm qua link'
        : t('policies.allow_join_link_false') || 'Không thể tham gia nhóm qua link',
    },
  ];

  const getActivePolicies = () => {
    const active: { key: string; icon: React.ReactNode; message: string }[] = [];
    
    policies.forEach((policy) => {
      const value = currentSettings.policies[policy.key];
      const message = policy.getMessage(value, t);
      active.push({
        key: policy.key,
        icon: policy.icon,
        message,
      });
    });

    return active;
  };

  const activePolicies = getActivePolicies();

  if (activePolicies.length === 0) {
    return null;
  }

  const getPolicyColor = () => {
    return theme.colors.warning || '#FF9500';
  };

  return (
    <View style={[styles.container, { backgroundColor: getPolicyColor() + '15' }]}>
      <View style={styles.header}>
        <AlertCircle size={16} color={getPolicyColor()} />
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          {t('policies.status_header') || 'Trạng thái nhóm'}
        </Text>
      </View>
      {activePolicies.map((policy) => (
        <View key={policy.key} style={styles.policyRow}>
          <View style={styles.policyIcon}>{policy.icon}</View>
          <Text style={[styles.policyText, { color: theme.colors.text }]}>
            {policy.message}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  policyIcon: {
    marginRight: 8,
  },
  policyText: {
    fontSize: 13,
    flex: 1,
  },
});

export default PolicyStatusBanner;
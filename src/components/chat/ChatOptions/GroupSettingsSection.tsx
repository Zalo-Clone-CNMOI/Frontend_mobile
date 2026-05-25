import { Settings, Shield, ToggleLeft, ToggleRight } from 'lucide-react-native';
import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { styles } from './styles';
import type { GroupSettings, GroupPermissionKey, GroupPolicyKey, GroupFeatureKey } from '../../../types/group-settings';
import { normalizeGroupSettings } from '../../../types/group-settings';
import { updateGroupSettings } from '../../../services/conversationsApi';
import { useConversationDetailStore } from '../../../store/useConversationDetailStore';

interface GroupSettingsSectionProps {
  theme: any;
  conversationId: string;
  myRole: 'owner' | 'admin' | 'member';
}

interface SettingToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
  theme: any;
  loading?: boolean;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  description,
  value,
  onValueChange,
  disabled,
  theme,
  loading,
}) => {
  return (
    <View style={[styles.settingToggleRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.settingToggleContent}>
        <Text style={[styles.settingToggleLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingToggleDescription, { color: theme.colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={disabled ? undefined : onValueChange}
          trackColor={{ false: theme.colors.disabled, true: theme.colors.primary + '50' }}
          thumbColor={value ? theme.colors.primary : theme.colors.card}
          disabled={disabled}
        />
      )}
    </View>
  );
};

interface SettingsCategoryProps {
  title: string;
  icon: React.ReactNode;
  theme: any;
  children: React.ReactNode;
}

const SettingsCategory: React.FC<SettingsCategoryProps> = ({ title, icon, theme, children }) => (
  <View style={[styles.settingsCategory, { backgroundColor: theme.colors.card }]}>
    <View style={[styles.settingsCategoryHeader, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.settingsCategoryIcon, { backgroundColor: theme.colors.primary + '15' }]}>
        {icon}
      </View>
      <Text style={[styles.settingsCategoryTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
    </View>
    {children}
  </View>
);

export const GroupSettingsSection: React.FC<GroupSettingsSectionProps> = ({
  theme,
  conversationId,
  myRole,
}) => {
  const { t } = useTranslation();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const settings = useConversationDetailStore((state) => state.getSettings(conversationId));
  const updateSettings = useConversationDetailStore((state) => state.updateSettings);
  const fetchConversationDetail = useConversationDetailStore((state) => state.fetchConversationDetail);

  const currentSettings = normalizeGroupSettings(settings);
  const isPrivileged = myRole === 'owner' || myRole === 'admin';
  const settingsLoaded = settings != null;

  const settingsRef = useRef(currentSettings);
  settingsRef.current = currentSettings;

  const handleToggle = useCallback(async (
    category: 'permissions' | 'policies' | 'features',
    key: string,
    value: boolean,
  ) => {
    if (!isPrivileged) return;
    if (!settingsLoaded) return;

    const previousSettings = settingsRef.current;

    updateSettings(conversationId, {
      ...previousSettings,
      [category]: {
        ...previousSettings[category],
        [key]: value,
      },
    });

    setLoadingKey(`${category}.${key}`);

    try {
      // Send only the toggled category with all its fields so server doesn't reset other categories
      const payload = {
        [category]: {
          ...currentSettings[category],
          [key]: value,
        },
      };

      console.log(`[GroupSettings] Updating ${conversationId}:`, payload);

      let response: any;
      let lastError: any;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await updateGroupSettings(conversationId, payload as any);
          console.log(`[GroupSettings] Response (attempt ${attempt}):`, response?.status, response?.data);
          break;
        } catch (error: any) {
          lastError = error;
          console.warn(`[GroupSettings] Attempt ${attempt} failed:`, error?.message);
          if (attempt < 2 && error.message?.includes('timeout')) {
            console.log(`[GroupSettings] Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }

      const detail = response?.data?.data || response?.data;
      const updatedSettings = detail?.settings;
      if (updatedSettings) {
        updateSettings(conversationId, normalizeGroupSettings(updatedSettings));
      }
      fetchConversationDetail(conversationId, true).catch(() => {});
    } catch (error: any) {
      console.error(`[GroupSettings] Error updating ${key}:`, error?.message, error?.code);

      updateSettings(conversationId, previousSettings);

      let errorMessage = error.message || t('group_settings.update_failed') || 'Failed to update settings';

      if (error.message?.includes('timeout')) {
        errorMessage = t('group_settings.timeout_error') || 'Request timed out. Please try again later.';
      } else if (error.message?.includes('403') || error?.code === 'FORBIDDEN') {
        errorMessage = t('group_settings.permission_denied') || 'You do not have permission to change this setting.';
      } else if (error.message?.includes('404')) {
        errorMessage = t('group_settings.not_found') || 'Group not found or has been deleted.';
      }

      Alert.alert(
        t('common.error') || 'Error',
        errorMessage,
      );
    } finally {
      setLoadingKey(null);
    }
  }, [conversationId, isPrivileged, settingsLoaded, updateSettings, fetchConversationDetail, t]);

  const isLoading = (category: string, key: string) => loadingKey === `${category}.${key}`;

  const permissions: { key: GroupPermissionKey; label: string; description?: string }[] = [
    { key: 'change_info', label: t('group_settings.change_info') || 'Change group info', description: t('group_settings.change_info_desc') || 'Members can edit group name and avatar' },
    { key: 'pin_message', label: t('group_settings.pin_message') || 'Pin messages', description: t('group_settings.pin_message_desc') || 'Members can pin messages' },
    { key: 'create_note', label: t('group_settings.create_note') || 'Create notes', description: t('group_settings.create_note_desc') || 'Members can create notes' },
    { key: 'create_poll', label: t('group_settings.create_poll') || 'Create polls', description: t('group_settings.create_poll_desc') || 'Members can create polls' },
    { key: 'send_message', label: t('group_settings.send_message') || 'Send messages', description: t('group_settings.send_message_desc') || 'Members can send messages' },
  ];

  const policies: { key: GroupPolicyKey; label: string; description?: string }[] = [
    { key: 'join_approval', label: t('group_settings.join_approval') || 'Require approval to join', description: t('group_settings.join_approval_desc') || 'Invitees must accept to join' },
    { key: 'allow_read_history', label: t('group_settings.allow_read_history') || 'New members can read history', description: t('group_settings.allow_read_history_desc') || 'Allow new members to see old messages' },
    { key: 'allow_join_link', label: t('group_settings.allow_join_link') || 'Allow join via link', description: t('group_settings.allow_join_link_desc') || 'Enable join-via-link flow' },
  ];

  const features: { key: GroupFeatureKey; label: string; description?: string }[] = [
    { key: 'admin_tagging', label: t('group_settings.admin_tagging') || '@admin tagging', description: t('group_settings.admin_tagging_desc') || 'Enable @admin mention' },
  ];

  return (
    <View style={styles.groupSettingsContainer}>
      <SettingsCategory
        title={t('group_settings.permissions') || 'Permissions'}
        icon={<Shield size={18} color={theme.colors.primary} />}
        theme={theme}
      >
        {permissions.map((perm) => (
          <SettingToggle
            key={perm.key}
            label={perm.label}
            description={perm.description}
            value={currentSettings.permissions[perm.key]}
            onValueChange={(value) => handleToggle('permissions', perm.key, value)}
            disabled={!isPrivileged || !settingsLoaded}
            theme={theme}
            loading={isLoading('permissions', perm.key)}
          />
        ))}
      </SettingsCategory>

      <SettingsCategory
        title={t('group_settings.policies') || 'Policies'}
        icon={<Settings size={18} color={theme.colors.primary} />}
        theme={theme}
      >
        {policies.map((policy) => (
          <SettingToggle
            key={policy.key}
            label={policy.label}
            description={policy.description}
            value={currentSettings.policies[policy.key]}
            onValueChange={(value) => handleToggle('policies', policy.key, value)}
            disabled={!isPrivileged || !settingsLoaded}
            theme={theme}
            loading={isLoading('policies', policy.key)}
          />
        ))}
      </SettingsCategory>

      <SettingsCategory
        title={t('group_settings.features') || 'Features'}
        icon={<ToggleLeft size={18} color={theme.colors.primary} />}
        theme={theme}
      >
        {features.map((feature) => (
          <SettingToggle
            key={feature.key}
            label={feature.label}
            description={feature.description}
            value={currentSettings.features[feature.key]}
            onValueChange={(value) => handleToggle('features', feature.key, value)}
            disabled={!isPrivileged || !settingsLoaded}
            theme={theme}
            loading={isLoading('features', feature.key)}
          />
        ))}
      </SettingsCategory>
      
      {!isPrivileged && (
        <View style={[styles.settingsReadOnlyNotice, { backgroundColor: theme.colors.primary + '10' }]}>
          <Text style={[styles.settingsReadOnlyText, { color: theme.colors.primary }]}>
            {t('group_settings.read_only_notice') || 'Only admins can change group settings'}
          </Text>
        </View>
      )}
    </View>
  );
};

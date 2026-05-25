import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import Animated, { FadeOutRight, FadeInRight, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Member } from '@/src/hooks/groupMembers/useGroupMembers';
import { getAvatarUrl } from '@/src/utils/groupMembers/avatarUrl';
import { RoleBadge } from './RoleBadge';
import { styles } from './styles';
import { type AppTheme } from '@/src/theme/themeManager';

interface MemberItemProps {
  member: Member;
  currentUserId: string;
  onRoleChange: (member: Member) => void;
  onRemove: (member: Member) => void;
  canChangeRole: boolean;
  canRemove: boolean;
  isRemoving?: boolean;
  theme: AppTheme;
}

export const MemberItem: React.FC<MemberItemProps> = ({
  member,
  currentUserId,
  onRoleChange,
  onRemove,
  canChangeRole,
  canRemove,
  isRemoving = false,
  theme,
}) => {
  const { t } = useTranslation();

  const handleRemovePress = () => {
    Alert.alert(
      t('chat_options.remove_member'),
      t('chat_options.remove_member_confirm', { name: member.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat_options.remove'),
          style: 'destructive',
          onPress: () => onRemove(member),
        }
      ]
    );
  };

  return (
    <Animated.View
      entering={FadeInRight.duration(200)}
      exiting={FadeOutRight.duration(200)}
      layout={Layout.duration(200)}
    >
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => canChangeRole && onRoleChange(member)}
        disabled={!canChangeRole}
        activeOpacity={canChangeRole ? 0.7 : 1}
      >
        <Image
          source={{ uri: getAvatarUrl(member.avatarUrl) }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {member.nickname || member.fullName}
          </Text>
          <View style={styles.memberRoleContainer}>
            <RoleBadge role={member.role} theme={theme} />
            {member.nickname && (
              <Text style={[styles.memberNickname, { color: theme.colors.muted }]}>
                @{member.nickname}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.memberActions}>
          {canChangeRole && (
            <Text style={[styles.changeRoleText, { color: theme.colors.primary }]}>{t('chat_options.change_role')}</Text>
          )}
          {canRemove && (
            <TouchableOpacity
              onPress={handleRemovePress}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size={20} color={theme.colors.error} />
              ) : (
                <Trash2 size={20} color={theme.colors.error} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

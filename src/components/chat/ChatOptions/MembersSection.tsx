import { Crown, Shield, Trash2, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './styles';

interface Member {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  nickname?: string;
}

interface MembersSectionProps {
  theme: any;
  members: Member[];
  memberCount: number;
  isLoading?: boolean;
  canChangeRole: (member: Member) => boolean;
  canRemoveMember: (member: Member) => boolean;
  onViewAll: () => void;
  onChangeRole: (member: Member) => void;
  onRemoveMember: (member: Member) => void;
}

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=default';

const RoleBadge: React.FC<{ role: 'owner' | 'admin' | 'member'; theme: any; t: any }> = ({
  role,
  theme,
  t,
}) => {
  if (role === 'owner') {
    return (
      <View style={[styles.roleBadge, { backgroundColor: '#FFD700' + '30' }]}>
        <Crown size={12} color="#FFD700" />
        <Text style={[styles.roleText, { color: '#B8860B' }]}>{t('member_role.owner')}</Text>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={[styles.roleBadge, { backgroundColor: '#FF9500' + '20' }]}>
        <Shield size={12} color="#FF9500" />
        <Text style={[styles.roleText, { color: '#FF9500' }]}>{t('member_role.admin')}</Text>
      </View>
    );
  }

  return null;
};

export const MembersSection: React.FC<MembersSectionProps> = ({
  theme,
  members,
  memberCount,
  isLoading,
  canChangeRole,
  canRemoveMember,
  onViewAll,
  onChangeRole,
  onRemoveMember,
}) => {
  const { t } = useTranslation();

  const renderMemberItem = ({ item }: { item: Member }) => {
    const showChangeRole = canChangeRole(item);
    const showRemove = canRemoveMember(item);

    return (
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => showChangeRole && onChangeRole(item)}
        disabled={!showChangeRole}
        activeOpacity={showChangeRole ? 0.7 : 1}
      >
        <Image
          source={{ uri: item.avatarUrl || DEFAULT_AVATAR }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {item.nickname || item.fullName}
          </Text>
          <View style={styles.memberRoleContainer}>
            <RoleBadge role={item.role} theme={theme} t={t} />
            {showChangeRole && (
              <Text style={[styles.changeRoleText, { color: theme.colors.primary }]}>
                {t('member_role.change')}
              </Text>
            )}
          </View>
        </View>
        {showRemove && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: '#FF3B30' + '15' }]}
              onPress={() => onRemoveMember(item)}
            >
              <Trash2 size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.additionalOptions, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity
        style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
        onPress={onViewAll}
      >
        <View style={styles.optionLeft}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.colors.primary + '15',
            }}
          >
            <User size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
              {t('chat_options.group_members')}
            </Text>
            <Text style={[styles.optionSubtitle, { color: theme.colors.textSecondary }]}>
              {memberCount} {t('chat_options.members')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* {isLoading ? (
        <View style={styles.membersLoadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : members.length === 0 ? (
        <Text style={[styles.noMembersText, { color: theme.colors.textSecondary }]}>
          {t('chat_options.no_members')}
        </Text>
      ) : (
        <FlatList
          data={members.slice(0, 5)}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
          contentContainerStyle={styles.membersList}
        />
      )} */}
    </View>
  );
};

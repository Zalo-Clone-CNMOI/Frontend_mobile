import { useTheme } from '@/src/theme/themeContext';
import { Check, X, Clock, Users, AlertCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
} from 'react-native';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useGroupInviteStore } from '@/src/store/useGroupInviteStore';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { GroupInviteDTO as Invite } from '@/src/types/dto/ApiDTO';
import { useRouter } from 'expo-router';
import { NETWORK_CONFIG } from '@/src/config/network';

const normalizeAvatar = (avatar?: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
  }
  return NETWORK_CONFIG.S3_BASE_URL + '/' + avatar.replace(/^\//, '');
};

export function InviteList() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const friends = useRealtimeStore((state) => state.friends);

  const {
    receivedInvites,
    isLoading,
    error,
    fetchPendingInvites,
    acceptInvite,
    rejectInvite,
  } = useGroupInviteStore();

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const handleAccept = async (invite: Invite) => {
    try {
      await acceptInvite(invite.conversationId, invite.id);
      Alert.alert(t('common.success'), t('group_errors.group_invite_accepted') || 'Invite accepted');
      router.replace({
        pathname: '/chat/[id]',
        params: { id: invite.conversationId },
      });
    } catch (err: any) {
      const errorMessage = err.message || t('group_errors.group_invite_invalid_status');
      Alert.alert(t('common.error'), errorMessage);
      // Force refresh on error
      fetchPendingInvites();
    }
  };

  const handleReject = async (invite: Invite) => {
    try {
      await rejectInvite(invite.conversationId, invite.id);
      Alert.alert(t('common.success'), t('group_errors.group_invite_rejected') || 'Invite rejected');
    } catch (err: any) {
      const errorMessage = err.message || t('group_errors.group_invite_invalid_status');
      Alert.alert(t('common.error'), errorMessage);
      // Force refresh on error
      fetchPendingInvites();
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return t('group_errors.group_invite_expired');

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  const renderInviteItem = ({ item }: { item: Invite }) => {
    // Lookup inviter avatar from friends store (backend only returns inviterUserId, not inviter object)
    const inviterFromFriends = friends.find(f => f.id === item.inviterUserId);
    const inviterAvatarUrl = inviterFromFriends?.avatarUrl || null;
    const normalizedAvatarUrl = normalizeAvatar(inviterAvatarUrl);

    return (
    <View style={[styles.inviteItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      {/* Group Avatar - showing inviter avatar instead of group name */}
      <AvatarWithInitials
        name={inviterFromFriends?.fullName || item.conversation?.name || 'Unknown'}
        size={50}
        avatarUrl={normalizedAvatarUrl}
      />

      {/* Group Info */}
      <View style={styles.inviteInfo}>
        <Text style={[styles.groupName, { color: theme.colors.text }]}>
          {item.conversation?.name || 'Unknown'}
        </Text>
        <View style={styles.inviterRow}>
          <Text style={[styles.inviterLabel, { color: theme.colors.icon }]}>
            {t('group_errors.invited_by') || 'Invited by'}
          </Text>
          <Text style={[styles.inviterName, { color: theme.colors.text }]}>
            {inviterFromFriends?.fullName || 'Unknown'}
          </Text>
        </View>
        {item.message && (
          <Text style={[styles.message, { color: theme.colors.icon }]} numberOfLines={1}>
            "{item.message}"
          </Text>
        )}
        <View style={styles.metaRow}>
          <Users size={14} color={theme.colors.icon} />
          <Text style={[styles.memberCount, { color: theme.colors.icon }]}>
            {item.conversation?.memberCount || 0} {t('group_errors.members') || 'members'}
          </Text>
          <Clock size={14} color={theme.colors.icon} style={styles.metaIcon} />
          <Text style={[styles.expiry, { color: theme.colors.icon }]}>
            {formatExpiry(item.expiresAt)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, { borderColor: theme.colors.border }]}
          onPress={() => handleReject(item)}
          disabled={isLoading}
        >
          <X size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => handleAccept(item)}
          disabled={isLoading}
        >
          <Check size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );};

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <AlertCircle size={48} color={theme.colors.icon} />
      <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
        {t('group_errors.no_pending_invites') || 'No pending invites'}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.icon }]}>
        {t('group_errors.no_pending_invites_desc') || 'You don\'t have any pending group invitations'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={receivedInvites.pending}
        renderItem={renderInviteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchPendingInvites}
            tintColor={theme.colors.primary}
          />
        }
      />
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: '#fee2e2' }]}>
          <AlertCircle size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderBottomWidth: 0.5,
  },
  inviteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inviterLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  inviterName: {
    fontSize: 13,
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginLeft: 8,
  },
  memberCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  expiry: {
    fontSize: 12,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  acceptButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginLeft: 8,
  },
});

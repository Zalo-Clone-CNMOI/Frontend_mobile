import { useTheme } from '@/src/theme/themeContext';
import { Bell, Check, X, Clock, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGroupInvite } from '@/src/hooks/useGroupInvite';
import { GroupInviteDTO as Invite } from '@/src/types/dto/ApiDTO';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { Users } from 'lucide-react-native';
import { useAuth } from '@/src/contexts/AuthContext';

type TabType = 'pending' | 'history';

export default function InviteCenterScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  
  // Use hook with autoFetch and autoSubscribeSocket enabled
  // Socket subscription is global (via AppRealtimeBridge) but we enable it here for safety
  const {
    receivedInvites,
    unreadCount,
    isLoading,
    acceptInvite,
    rejectInvite,
    fetchPendingInvites,
  } = useGroupInvite({
    userId: user?.id,
    autoFetch: true,
    autoSubscribeSocket: true,
  });

  const [activeTab, setActiveTab] = React.useState<TabType>('pending');

  const handleAccept = async (invite: Invite) => {
    try {
      await acceptInvite(invite.conversationId, invite.id);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: invite.conversationId },
      });
    } catch (err) {
      // Error handled in store
    }
  };

  const handleReject = async (invite: Invite) => {
    try {
      await rejectInvite(invite.conversationId, invite.id);
    } catch (err) {
      // Error handled in store
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

  const getInvitesForTab = (): Invite[] => {
    switch (activeTab) {
      case 'pending':
        return receivedInvites.pending;
      case 'history':
        return [...receivedInvites.accepted, ...receivedInvites.rejected, ...receivedInvites.cancelled, ...receivedInvites.expired];
      default:
        return [];
    }
  };

  const renderInviteItem = ({ item }: { item: Invite }) => {
    const isPending = item.status === 'pending';
    const isExpired = item.status === 'expired';

    return (
      <View style={[styles.inviteItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <AvatarWithInitials
          name={item.conversation?.name || 'Unknown'}
          size={50}
        />
        <View style={styles.inviteInfo}>
          <Text style={[styles.groupName, { color: theme.colors.text }]}>
            {item.conversation?.name || 'Unknown'}
          </Text>
          <View style={styles.inviterRow}>
            <Text style={[styles.inviterLabel, { color: theme.colors.icon }]}>
              {t('group_errors.invited_by') || 'Invited by'}
            </Text>
            <Text style={[styles.inviterName, { color: theme.colors.text }]}>
              {item.inviter?.fullName || 'Unknown'}
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
            <Text style={[styles.expiry, { color: isExpired ? '#ef4444' : theme.colors.icon }]}>
              {formatExpiry(item.expiresAt)}
            </Text>
          </View>
          {item.status !== 'pending' && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {isPending && (
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
        )}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'cancelled':
        return '#f59e0b';
      case 'expired':
        return '#6b7280';
      default:
        return theme.colors.primary;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bell size={48} color={theme.colors.icon} />
      <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
        {activeTab === 'pending'
          ? (t('group_errors.no_pending_invites') || 'No pending invites')
          : (t('group_errors.no_history') || 'No history')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.iconHeader} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.iconHeader }]}>
          {t('group_errors.invite_center') || 'Group Invites'}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'pending' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' ? styles.activeTabText : {},
              { color: activeTab === 'pending' ? theme.colors.primary : theme.colors.icon },
            ]}
          >
            {t('group_errors.pending') || 'Pending'}
          </Text>
          {receivedInvites.pending.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.tabBadgeText}>{receivedInvites.pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'history' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' ? styles.activeTabText : {},
              { color: activeTab === 'history' ? theme.colors.primary : theme.colors.icon },
            ]}
          >
            {t('group_errors.history') || 'History'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={getInvitesForTab()}
        renderItem={renderInviteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 56,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 15,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#ff453a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
    fontSize: 16,
    marginTop: 16,
  },
});

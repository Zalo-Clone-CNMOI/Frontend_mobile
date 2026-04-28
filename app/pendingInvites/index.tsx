import { useTheme } from '@/src/theme/themeContext';
import { X, Check, Clock, AlertCircle, Users, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useGroupInviteStore } from '@/src/store/useGroupInviteStore';
import { acceptGroupInvite, rejectGroupInvite, GroupInviteDTO } from '@/src/services/groupInviteApi';
import { subscribeToGroupInviteEvents, unsubscribeFromGroupInviteEvents } from '@/src/services/groupInviteSocketHandler';
import { useAuth } from '@/src/contexts/AuthContext';

type FilterType = 'pending' | 'accepted' | 'rejected' | 'expired';

export default function PendingInvitesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Get store state and actions
  const { 
    receivedInvites, 
    unreadCount, 
    isLoading, 
    fetchPendingInvites,
    setUnreadCount,
  } = useGroupInviteStore();

  // Subscribe to socket events
  useEffect(() => {
    if (user?.id) {
      subscribeToGroupInviteEvents(user.id);
      return () => unsubscribeFromGroupInviteEvents();
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchPendingInvites({ status: activeFilter });
  }, [activeFilter]);

  // Clear unread count when screen opens
  useEffect(() => {
    if (unreadCount > 0) {
      setUnreadCount(0);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingInvites({ status: activeFilter, force: true });
    setRefreshing(false);
  };

  const handleAccept = async (invite: GroupInviteDTO) => {
    setActionLoading(invite.id);
    try {
      await acceptGroupInvite(invite.conversationId, invite.id);
      Alert.alert(
        t('common.success'), 
        t('group_errors.group_invite_accepted') || 'Invite accepted successfully'
      );
      // Refresh list
      await fetchPendingInvites({ status: activeFilter });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to accept invite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invite: GroupInviteDTO) => {
    Alert.alert(
      t('common.confirm'),
      t('group_errors.reject_invite_confirm') || 'Are you sure you want to reject this invite?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(invite.id);
            try {
              await rejectGroupInvite(invite.conversationId, invite.id);
              Alert.alert(
                t('common.success'), 
                t('group_errors.group_invite_rejected') || 'Invite rejected'
              );
              await fetchPendingInvites({ status: activeFilter });
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || 'Failed to reject invite');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.primary;
      case 'accepted':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'expired':
        return '#8E8E93';
      default:
        return theme.colors.icon;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={getStatusColor(status)} />;
      case 'accepted':
        return <Check size={16} color={getStatusColor(status)} />;
      case 'rejected':
        return <X size={16} color={getStatusColor(status)} />;
      case 'expired':
        return <AlertCircle size={16} color={getStatusColor(status)} />;
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('timeAgo.justNow') || 'Just now';
    if (diffMins < 60) return t('timeAgo.minutes', { count: diffMins }) || `${diffMins}m ago`;
    if (diffHours < 24) return t('timeAgo.hours', { count: diffHours }) || `${diffHours}h ago`;
    return t('timeAgo.days', { count: diffDays }) || `${diffDays}d ago`;
  };

  const renderInviteCard = (invite: GroupInviteDTO) => {
    const isPending = invite.status === 'pending';
    const isLoading = actionLoading === invite.id;

    return (
      <View 
        key={invite.id} 
        style={[styles.inviteCard, { backgroundColor: theme.colors.card }]}
      >
        {/* Group Info */}
        <View style={styles.groupHeader}>
          <AvatarWithInitials
            name={invite.conversation?.name || t('group_errors.group') || 'Group'}
            size={48}
          />
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: theme.colors.text }]} numberOfLines={1}>
              {invite.conversation?.name || t('group_errors.group') || 'Group'}
            </Text>
            <View style={styles.statusRow}>
              {getStatusIcon(invite.status)}
              <Text style={[styles.statusText, { color: getStatusColor(invite.status) }]}>
                {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, { color: theme.colors.icon }]}>
            {formatTimeAgo(invite.createdAt)}
          </Text>
        </View>

        {/* Inviter Info */}
        <View style={styles.inviterRow}>
          <Users size={16} color={theme.colors.icon} />
          <Text style={[styles.inviterText, { color: theme.colors.icon }]}>
            {t('group_errors.invited_by') || 'Invited by'}: {invite.inviter?.fullName || 'Unknown'}
          </Text>
        </View>

        {/* Message */}
        {invite.message && (
          <View style={[styles.messageContainer, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.messageText, { color: theme.colors.text }]} numberOfLines={2}>
              "{invite.message}"
            </Text>
          </View>
        )}

        {/* Member Count */}
        {invite.conversation?.memberCount !== undefined && (
          <View style={styles.memberCountRow}>
            <Users size={14} color={theme.colors.icon} />
            <Text style={[styles.memberCountText, { color: theme.colors.icon }]}>
              {invite.conversation.memberCount} {t('group_errors.members') || 'members'}
            </Text>
          </View>
        )}

        {/* Action Buttons - Only for Pending */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.rejectButton, { borderColor: '#FF3B30' }]}
              onPress={() => handleReject(invite)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <>
                  <X size={18} color="#FF3B30" />
                  <Text style={styles.rejectButtonText}>
                    {t('common.reject') || 'Reject'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleAccept(invite)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.acceptButtonText}>
                    {t('common.accept') || 'Accept'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'pending', label: t('group_errors.filter_pending') || 'Pending' },
    { key: 'accepted', label: t('group_errors.filter_accepted') || 'Accepted' },
    { key: 'rejected', label: t('group_errors.filter_rejected') || 'Rejected' },
    { key: 'expired', label: t('group_errors.filter_expired') || 'Expired' },
  ];

  const currentInvites = receivedInvites[activeFilter];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('group_errors.invite_center') || 'Group Invites'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Badge Count */}
      {unreadCount > 0 && (
        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
            {unreadCount} {t('group_errors.new_invites') || 'new invites'}
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === filter.key ? theme.colors.primary : theme.colors.card,
                borderColor: activeFilter === filter.key ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === filter.key ? '#fff' : theme.colors.text },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Invites List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : currentInvites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={theme.colors.border} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {activeFilter === 'pending' 
                ? t('group_errors.no_pending_invites') || 'No pending invites'
                : t('group_errors.no_history') || 'No history'
              }
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.icon }]}>
              {activeFilter === 'pending'
                ? t('group_errors.no_pending_invites_desc') || 'You don\'t have any pending group invitations'
                : ''
              }
            </Text>
          </View>
        ) : (
          <View style={styles.invitesList}>
            {currentInvites.map((invite) => renderInviteCard(invite))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 28,
  },
  badgeContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  invitesList: {
    padding: 16,
  },
  inviteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    marginLeft: 4,
  },
  timeAgo: {
    fontSize: 12,
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  inviterText: {
    fontSize: 13,
    marginLeft: 6,
  },
  messageContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  memberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberCountText: {
    fontSize: 13,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

import { useTheme } from '@/src/theme/themeContext';
import { X, Clock, Check, AlertCircle, Send, UserPlus } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { sendInvites, getConversationDetail } from '@/src/services/conversationsApi';
import { getFriends } from '@/src/services/friendsApi';
import { getConversationInvites, cancelInvite } from '@/src/services/conversationsApi';
import { GroupInviteDTO as Invite, GroupInviteStatus } from '@/src/types/dto/ApiDTO';
import { ChevronLeft } from 'lucide-react-native';
import { subscribeToGroupInviteEvents, unsubscribeFromGroupInviteEvents } from '@/src/services/groupInviteSocketHandler';
import { useAuth } from '@/src/contexts/AuthContext';

type TabType = 'invite' | 'view';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'expired';

export default function GroupInviteCenterScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { id: conversationId, name: conversationName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();

  const [activeTab, setActiveTab] = useState<TabType>('invite');

  // Invite tab state
  const friends = useRealtimeStore((state) => state.friends);
  const setFriendSnapshot = useRealtimeStore((state) => state.setFriendSnapshot);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingInviteUserIds, setPendingInviteUserIds] = useState<Set<string>>(new Set());
  const [memberUserIds, setMemberUserIds] = useState<Set<string>>(new Set());

  // View tab state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  // Subscribe to socket events for realtime updates
  useEffect(() => {
    if (user?.id) {
      subscribeToGroupInviteEvents(user.id);
      return () => unsubscribeFromGroupInviteEvents();
    }
  }, [user?.id]);

  // Fetch friends, members and pending invites when invite tab mounts
  useEffect(() => {
    if (activeTab === 'invite') {
      fetchFriends();
      // Also fetch pending invites to disable already invited friends
      fetchPendingInvitesForFilter();
      // Fetch conversation members to filter existing members
      fetchConversationMembers();
    }
  }, [activeTab]);

  // Fetch invites when view tab mounts or filter changes
  useEffect(() => {
    if (activeTab === 'view') {
      fetchInvites();
    }
  }, [activeTab, statusFilter]);

  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await getFriends({ limit: 100 });
      const friendsData = response.data?.data || response.data || [];
      
      const friendRecords = friendsData.map((friend: any) => ({
        id: friend.id || friend._id || friend.userId,
        fullName: friend.name || friend.fullName || `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
        avatarUrl: friend.avatarUrl || null,
        userId: friend.userId || friend.id || friend._id,
      }));

      setFriendSnapshot({
        friends: friendRecords,
        receivedRequests: [],
        sentRequests: [],
      });
    } catch (error: any) {
      console.error('Failed to fetch friends:', error);
      Alert.alert(t('common.error'), error.message || t('group_errors.failed_load_friends'));
    } finally {
      setFriendsLoading(false);
    }
  };

  const fetchPendingInvitesForFilter = async () => {
    try {
      const response = await getConversationInvites(conversationId, {
        status: 'pending',
        limit: 50,
        page: 1,
      });
      
      // API returns { data: { success: true, data: [...], meta: {...} } }
      const items = response.data?.data || response.data || [];
      
      // Extract userIds that already have pending invites
      const pendingUserIds = new Set<string>();
      items.forEach((invite: Invite) => {
        pendingUserIds.add(invite.invitedUserId);
      });
      setPendingInviteUserIds(pendingUserIds);
    } catch (error: any) {
      console.error('[GroupInviteCenter] Fetch pending invites for filter error:', error);
    }
  };

  const fetchConversationMembers = async () => {
    setMembersLoading(true);
    try {
      const response = await getConversationDetail(conversationId);
      const conversation = response.data?.data || response.data;
      
      const memberIds = new Set<string>();
      conversation?.members?.forEach((member: any) => {
        const id = member.userId || member.id;
        if (id) memberIds.add(id);
      });
      
      setMemberUserIds(memberIds);
    } catch (error: any) {
      console.error('[GroupInviteCenter] Fetch conversation members error:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchInvites = async () => {
    setViewLoading(true);
    try {
      
      const response = await getConversationInvites(conversationId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
        page: 1,
      });
      
      // API returns { data: { success: true, data: [...], meta: {...} } }
      let items = response.data?.data || response.data || [];
      
      // Enrich invites with conversation details and member info
      if (items.length > 0) {
        try {
          const convResponse = await getConversationDetail(conversationId);
          const conversation = convResponse.data;
          
          items = items.map((invite: Invite) => {
            const inviterMember = conversation?.members?.find(
              (m: any) => m.userId === invite.inviterUserId
            );
            
            return {
              ...invite,
              conversation: {
                id: invite.conversationId,
                name: conversation?.name || null,
                avatarUrl: conversation?.avatarUrl || null,
                memberCount: conversation?.members?.length || 0,
              },
              inviter: {
                id: invite.inviterUserId,
                fullName: inviterMember?.fullName || t('group_errors.unknown'),
                avatarUrl: inviterMember?.avatarUrl || null,
              },
            };
          });
          
        } catch (err) {
          console.error('[GroupInviteCenter] Failed to enrich invites:', err);
        }
      }
      
      // Also update pending userIds when fetching all or pending invites
      if (statusFilter === 'all' || statusFilter === 'pending') {
        const pendingUserIds = new Set<string>();
        items.forEach((invite: Invite) => {
          if (invite.status === 'pending') {
            pendingUserIds.add(invite.invitedUserId);
          }
        });
        setPendingInviteUserIds(pendingUserIds);
      }
      
      setInvites(items);
    } catch (error: any) {
      console.error('[GroupInviteCenter] Fetch invites error:', error);
      Alert.alert(t('common.error'), error.message || t('group_errors.failed_load_invites'));
    } finally {
      setViewLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        if (next.size >= 50) {
          Alert.alert(t('common.error'), t('group_errors.max_invites'));
          return prev;
        }
        next.add(friendId);
      }
      return next;
    });
  };

  const isFriendSelected = (friendId: string) => selectedFriends.has(friendId);

  const handleSendInvites = async () => {
    if (selectedFriends.size === 0) {
      Alert.alert(t('common.error'), t('group_errors.select_at_least_one'));
      return;
    }

    setInviteLoading(true);
    try {
      const userIds = Array.from(selectedFriends);
      const payload = {
        userIds,
        message: message.trim() || undefined,
        expiresInHours,
      };

      const response = await sendInvites(conversationId, payload);
      const result = response.data || response;

      const { acceptedCount, skippedCount } = result;

      let successMessage = t('group_errors.invites_sent');
      successMessage += `\n${t('group_errors.accepted')}: ${acceptedCount}`;
      if (skippedCount > 0) {
        successMessage += `\n${t('group_errors.skipped')}: ${skippedCount}`;
      }

      Alert.alert(t('common.success'), successMessage);
      
      // Reset form
      setSelectedFriends(new Set());
      setMessage('');
      setExpiresInHours(168);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('group_errors.invite_failed'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    Alert.alert(
      t('common.confirm'),
      t('group_errors.cancel_invite_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvite(conversationId, inviteId);
              Alert.alert(t('common.success'), t('group_errors.invite_cancelled'));
              fetchInvites();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('group_errors.failed_cancel_invite'));
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: GroupInviteStatus) => {
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

  const getStatusIcon = (status: GroupInviteStatus) => {
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

  const renderInviteTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Message Input */}
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t('group_errors.invite_message')}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder={t('group_errors.invite_message_placeholder')}
          placeholderTextColor={theme.colors.icon}
          value={message}
          onChangeText={setMessage}
          maxLength={500}
          multiline
        />
        <Text style={[styles.charCount, { color: theme.colors.icon }]}>
          {message.length}/500
        </Text>
      </View>

      {/* Expiry Time */}
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t('group_errors.expiry_time')}
        </Text>
        <View style={styles.expiryOptions}>
          {[
            { label: '24h', value: 24 },
            { label: '3d', value: 72 },
            { label: '7d', value: 168 },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.expiryOption,
                {
                  backgroundColor: expiresInHours === option.value ? theme.colors.primary : theme.colors.card,
                  borderColor: expiresInHours === option.value ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setExpiresInHours(option.value)}
            >
              <Text
                style={[
                  styles.expiryOptionText,
                  { color: expiresInHours === option.value ? '#fff' : theme.colors.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Friends List */}
      <View style={styles.friendsSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {t('group_errors.select_friends')}
        </Text>
        <Text style={[styles.selectedCount, { color: theme.colors.icon }]}>
          {selectedFriends.size} {t('group_errors.selected')}
        </Text>
      </View>

      <View style={[styles.friendsList, { backgroundColor: theme.colors.card }]}>
        {friendsLoading || membersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
              {t('group_errors.loading_friends')}
            </Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
              {t('group_errors.no_friends')}
            </Text>
          </View>
        ) : (
          friends.map((friend) => {
            const hasPendingInvite = pendingInviteUserIds.has(friend.id);
            const isMember = memberUserIds.has(friend.id);
            const isSelected = isFriendSelected(friend.id);
            
            return (
              <View key={friend.id} style={styles.friendItemWrapper}>
                <TouchableOpacity
                  style={[
                    styles.friendItem,
                    {
                      backgroundColor: isSelected ? theme.colors.primary + '15' : 'transparent',
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      opacity: (hasPendingInvite || isMember) ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => !hasPendingInvite && !isMember && toggleFriendSelection(friend.id)}
                  activeOpacity={(hasPendingInvite || isMember) ? 1 : 0.7}
                  disabled={hasPendingInvite || isMember}
                >
                  <AvatarWithInitials
                    name={friend.fullName}
                    size={44}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text 
                      style={[
                        styles.friendName, 
                        { color: theme.colors.text }
                      ]} 
                      numberOfLines={1}
                    >
                      {friend.fullName}
                    </Text>
                    {hasPendingInvite && (
                      <Text style={[styles.pendingLabel, { color: theme.colors.primary }]}>
                        {t('group_errors.filter_pending') || 'Pending invite'}
                      </Text>
                    )}
                    {isMember && (
                      <Text style={[styles.pendingLabel, { color: '#34C759' }]}>
                        {t('chat_options.already_member') || 'Already a member'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    {isSelected && <X size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  const renderViewTab = () => {
    const filters: { key: StatusFilter; label: string }[] = [
      { key: 'all', label: t('group_errors.filter_all') },
      { key: 'pending', label: t('group_errors.filter_pending') },
      { key: 'accepted', label: t('group_errors.filter_accepted') },
      { key: 'rejected', label: t('group_errors.filter_rejected') },
      { key: 'expired', label: t('group_errors.filter_expired') },
    ];

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === filter.key ? theme.colors.primary : theme.colors.card,
                  borderColor: statusFilter === filter.key ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === filter.key ? '#fff' : theme.colors.text },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invites List */}
        {viewLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : invites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
              {t('group_errors.no_history')}
            </Text>
          </View>
        ) : (
          invites.map((invite) => {
            // Get invited user name from friends list
            const invitedFriend = friends.find((f) => f.id === invite.invitedUserId);
            const invitedName = invitedFriend?.fullName || invite.invitedUserId.substring(0, 8) + '...';
            
            return (
              <View key={invite.id} style={[styles.inviteItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                <AvatarWithInitials
                  name={invitedName}
                  size={44}
                />
                <View style={styles.inviteContent}>
                  <Text style={[styles.inviteName, { color: theme.colors.text }]}>
                    {invitedName}
                  </Text>
                  <Text style={[styles.inviteStatus, { color: getStatusColor(invite.status) }]}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </Text>
                  {invite.message && (
                    <Text style={[styles.inviteMessage, { color: theme.colors.icon }]} numberOfLines={2}>
                      "{invite.message}"
                    </Text>
                  )}
                  <Text style={[styles.inviteDate, { color: theme.colors.icon }]}>
                    {new Date(invite.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <View style={styles.statusBadge}>
                    {getStatusIcon(invite.status)}
                  </View>
                  {invite.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.cancelButton, { borderColor: '#FF3B30' }]}
                      onPress={() => handleCancelInvite(invite.id)}
                    >
                      <X size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('group_errors.invite_center')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Group Name */}
      <View style={[styles.groupInfo, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.groupLabel, { color: theme.colors.icon }]}>
          {t('group_errors.group')}
        </Text>
        <Text style={[styles.groupName, { color: theme.colors.text }]} numberOfLines={1}>
          {conversationName}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabSwitcher, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'invite' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('invite')}
        >
          <UserPlus size={18} color={activeTab === 'invite' ? theme.colors.primary : theme.colors.icon} />
          <Text style={[styles.tabText, { color: activeTab === 'invite' ? theme.colors.primary : theme.colors.icon }]}>
            {t('group_errors.invite')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'view' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('view')}
        >
          <Clock size={18} color={activeTab === 'view' ? theme.colors.primary : theme.colors.icon} />
          <Text style={[styles.tabText, { color: activeTab === 'view' ? theme.colors.primary : theme.colors.icon }]}>
            {t('group_errors.view_invites')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'invite' ? renderInviteTab() : renderViewTab()}

      {/* Footer - Only for Invite tab */}
      {activeTab === 'invite' && (
        <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: selectedFriends.size > 0 && !inviteLoading ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={handleSendInvites}
            disabled={selectedFriends.size === 0 || inviteLoading}
          >
            {inviteLoading ? (
              <Text style={styles.sendText}>{t('common.loading')}</Text>
            ) : (
              <View style={styles.sendButtonContent}>
                <Send size={18} color={selectedFriends.size > 0 ? '#fff' : theme.colors.icon} />
                <Text
                  style={[
                    styles.sendText,
                    { color: selectedFriends.size > 0 ? '#fff' : theme.colors.icon },
                  ]}
                >
                  {t('group_errors.send_invites')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
  },
  groupLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 80,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  expiryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  expiryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  expiryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  friendsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 13,
  },
  friendsList: {
    flex: 1,
    minHeight: 100,
    maxHeight: 400,
    borderRadius: 8,
    padding: 8,
  },
  friendItemWrapper: {
    marginBottom: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
  emptyText: {
    fontSize: 15,
  },
  filterScroll: {
    marginBottom: 16,
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
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
  },
  inviteContent: {
    flex: 1,
    marginLeft: 12,
  },
  inviteName: {
    fontSize: 15,
    fontWeight: '500',
  },
  inviteStatus: {
    fontSize: 13,
    marginTop: 4,
  },
  inviteMessage: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  inviteDate: {
    fontSize: 12,
    marginTop: 4,
  },
  inviteActions: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    padding: 4,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  sendButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

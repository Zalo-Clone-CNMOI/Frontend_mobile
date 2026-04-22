import { useTheme } from '@/src/theme/themeContext';
import { X, Clock, Send, AlertCircle, ChevronLeft, UserX } from 'lucide-react-native';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { getConversationDetail } from '@/src/services/conversationsApi';
import { getFriends } from '@/src/services/friendsApi';
import { useGroupInvite } from '@/src/hooks/useGroupInvite';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GroupInviteDTO as Invite } from '@/src/types/dto/ApiDTO';

export default function GroupInviteScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const conversationId = params.conversationId as string;
  const conversationName = params.conversationName as string;
  
  // Use group invite hook - socket auto-subscribed globally in AppRealtimeBridge
  const { 
    sendInvites, 
    isSending,
    sentInvites,
    isLoading,
    cancelInvite,
    fetchConversationInvites,
  } = useGroupInvite({
    userId: user?.id,
    autoFetch: false, // Don't need to fetch on this screen
    autoSubscribeSocket: false, // Already subscribed globally
  });
  
  const realtimeFriends = useRealtimeStore((state) => state.friends);
  const [friends, setFriends] = useState(realtimeFriends);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168); // Default 7 days
  const [activeTab, setActiveTab] = useState<'send' | 'sent'>('send');

  const fetchGroupMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await getConversationDetail(conversationId);
      const data = response.data?.data;
      if (data?.members) {
        setGroupMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch group members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await getFriends({ limit: 100 });
      if (response.data?.data) {
        // Filter out friends who are already in the group
        const memberIds = new Set(groupMembers.map((m) => m.userId || m.id));
        const filteredFriends = response.data.data.filter((friend: any) => !memberIds.has(friend.id));
        setFriends(filteredFriends);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Fetch group members and friends
  useEffect(() => {
    fetchGroupMembers();
    if (realtimeFriends.length === 0) {
      fetchFriends();
    }
  }, [realtimeFriends]);

  // Filter friends when group members change
  useEffect(() => {
    if (groupMembers.length > 0) {
      const memberIds = new Set(groupMembers.map((m) => m.userId || m.id));
      const filteredFriends = friends.filter((friend) => !memberIds.has(friend.id));
      setFriends(filteredFriends);
    }
  }, [groupMembers]);

  // Fetch conversation invites when switching to 'sent' tab
  useEffect(() => {
    if (activeTab === 'sent' && conversationId) {
      console.log('[GroupInvite] Fetching conversation invites for sent tab');
      fetchConversationInvites(conversationId, 'pending');
    }
  }, [activeTab, conversationId, fetchConversationInvites]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        if (next.size >= 50) {
          Alert.alert(t('common.error'), t('group_errors.max_invites') || 'Maximum 50 invites');
          return prev;
        }
        next.add(friendId);
      }
      return next;
    });
  };

  const isFriendSelected = (friendId: string) => selectedFriends.has(friendId);

  const handleCancelInvite = async (invite: Invite) => {
    Alert.alert(
      t('group_errors.cancel_invite_title') || 'Cancel Invite',
      t('group_errors.cancel_invite_message') || 'Are you sure you want to cancel this invite?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvite(invite.conversationId, invite.id);
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const formatExpiry = (expiresAt: string) => {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return t('group_errors.group_invite_expired') || 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
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

  const handleSendInvites = async () => {
    console.log('[GroupInvite] handleSendInvites called');
    console.log('[GroupInvite] selectedFriends size:', selectedFriends.size);
    
    if (selectedFriends.size === 0) {
      Alert.alert(t('common.error'), t('group_errors.select_friends') || 'Please select at least one friend');
      return;
    }

    try {
      const userIds = Array.from(selectedFriends);
      const payload = {
        userIds,
        message: message.trim() || undefined,
        expiresInHours,
      };

      console.log('[GroupInvite] Sending invites with payload:', JSON.stringify(payload, null, 2));
      console.log('[GroupInvite] conversationId:', conversationId);

      await sendInvites(conversationId, payload);
      
      // Backend handles sending invites via Kafka events and push notifications
      // Recipients will receive invites via socket (handled in AppRealtimeBridge)
      // and can view/accept them in inviteCenter
      
      const successMessage = t('group_errors.invites_sent') || 'Invites sent successfully';
      Alert.alert(t('common.success'), successMessage);
      
      // Reset form and switch to Sent tab to show sent invites
      setSelectedFriends(new Set());
      setMessage('');
      setExpiresInHours(168);
      setActiveTab('sent');
      
      // Fetch conversation invites to show sent list
      await fetchConversationInvites(conversationId, 'pending');
    } catch (error: any) {
      console.error('[GroupInvite] Error sending invites:', error);
      Alert.alert(t('common.error'), error.message || t('group_errors.invite_failed'));
    }
  };

  const renderFriendItem = ({ friendId, fullName, avatarUrl }: { friendId: string; fullName: string; avatarUrl?: string | null }) => {
    const isSelected = isFriendSelected(friendId);
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          {
            backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.card,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={() => toggleFriendSelection(friendId)}
        activeOpacity={0.7}
      >
        <AvatarWithInitials
          name={fullName}
          size={44}
        />
        <Text style={[styles.friendName, { color: theme.colors.text }]} numberOfLines={1}>
          {fullName}
        </Text>
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
    );
  };

  const renderSentInviteItem = ({ item }: { item: Invite }) => {
    // Find friend info from friends list
    const invitedFriend = friends.find((f) => f.id === item.invitedUserId);
    const displayName = invitedFriend?.fullName || item.invitedUserId;

    return (
      <View style={[styles.sentInviteItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <AvatarWithInitials
          name={displayName}
          size={44}
        />
        <View style={styles.sentInviteInfo}>
          <Text style={[styles.sentInviteName, { color: theme.colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.sentInviteMeta}>
            <Clock size={12} color={theme.colors.icon} />
            <Text style={[styles.sentInviteExpiry, { color: theme.colors.icon }]}>
              {formatExpiry(item.expiresAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.cancelInviteButton, { borderColor: '#ef4444' }]}
            onPress={() => handleCancelInvite(item)}
          >
            <UserX size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.statusBar }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={theme.colors.iconHeader} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.iconHeader }]}>
          {t('group_errors.invite_to_group') || 'Invite to Group'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'send' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('send')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'send' ? styles.activeTabText : {},
              { color: activeTab === 'send' ? theme.colors.primary : theme.colors.icon },
            ]}
          >
            {t('group_errors.send') || 'Send'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'sent' ? theme.colors.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('sent')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'sent' ? styles.activeTabText : {},
              { color: activeTab === 'sent' ? theme.colors.primary : theme.colors.icon },
            ]}
          >
            {t('group_errors.sent') || 'Sent'}
          </Text>
          {sentInvites.pending.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.tabBadgeText}>{sentInvites.pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {activeTab === 'send' ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Group Name */}
            <View style={[styles.groupInfo, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.groupLabel, { color: theme.colors.icon }]}>
                {t('group_errors.group') || 'Group'}
              </Text>
              <Text style={[styles.groupName, { color: theme.colors.text }]} numberOfLines={1}>
                {conversationName}
              </Text>
            </View>

            {/* Message Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('group_errors.invite_message') || 'Message (optional)'}
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
                placeholder={t('group_errors.invite_message_placeholder') || 'Add a message...'}
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
                {t('group_errors.expiry_time') || 'Expiry Time'}
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
                {t('group_errors.select_friends') || 'Select Friends'}
              </Text>
              <Text style={[styles.selectedCount, { color: theme.colors.icon }]}>
                {selectedFriends.size} {t('group_errors.selected') || 'selected'}
              </Text>
            </View>

            {loadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
                  {t('contacts.no_contacts') || 'No friends'}
                </Text>
              </View>
            ) : (
              <View style={styles.friendsList}>
                {friends.map((friend) => (
                  <View key={friend.id} style={styles.friendItemWrapper}>
                    {renderFriendItem({
                      friendId: friend.id,
                      fullName: friend.fullName || '',
                      avatarUrl: friend.avatarUrl,
                    })}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={[...sentInvites.pending, ...sentInvites.accepted, ...sentInvites.rejected, ...sentInvites.cancelled, ...sentInvites.expired]}
            renderItem={renderSentInviteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.sentListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
                  {t('group_errors.no_sent_invites') || 'No sent invites'}
                </Text>
              </View>
            }
          />
        )}

        {/* Footer - only show on send tab */}
        {activeTab === 'send' && (
          <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => router.back()}
              disabled={isSending}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: selectedFriends.size > 0 && !isSending ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={handleSendInvites}
              disabled={selectedFriends.size === 0 || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={selectedFriends.size > 0 ? '#fff' : theme.colors.icon} />
              ) : (
                <View style={styles.sendButtonContent}>
                  <Send size={18} color={selectedFriends.size > 0 ? '#fff' : theme.colors.icon} />
                  <Text
                    style={[
                      styles.sendText,
                      { color: selectedFriends.size > 0 ? '#fff' : theme.colors.icon },
                    ]}
                  >
                    {t('group_errors.send_invites') || 'Send Invites'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    height: 56,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
  },
  headerRight: {
    width: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
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
    marginBottom: 20,
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
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 0.5,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    flex: 2,
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
  sentListContent: {
    padding: 16,
  },
  sentInviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  sentInviteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sentInviteName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  sentInviteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentInviteExpiry: {
    fontSize: 12,
    marginLeft: 4,
  },
  cancelInviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 8,
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
});

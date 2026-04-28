import { useTheme } from '@/src/theme/themeContext';
import { X, Clock, Send, AlertCircle } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { sendInvites } from '@/src/services/conversationsApi';
import { getFriends } from '@/src/services/friendsApi';

interface GroupInviteModalProps {
  visible: boolean;
  conversationId: string;
  conversationName: string;
  existingMemberIds?: string[]; // Friend IDs to exclude (already members)
  onClose: () => void;
  onInviteSent?: () => void;
}

export function GroupInviteModal({
  visible,
  conversationId,
  conversationName,
  existingMemberIds = [],
  onClose,
  onInviteSent,
}: GroupInviteModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const friends = useRealtimeStore((state) => state.friends);
  const setFriendSnapshot = useRealtimeStore((state) => state.setFriendSnapshot);

  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168); // Default 7 days
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Fetch friends when modal opens
  useEffect(() => {
    if (visible) {
      fetchFriends();
    }
  }, [visible]);

  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await getFriends({ limit: 100 });
      
      const friendsData = response.data?.data || response.data || [];
      
      // Convert to FriendRecord format for useRealtimeStore
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
      Alert.alert(t('common.error'), error.message || 'Failed to load friends');
    } finally {
      setFriendsLoading(false);
    }
  };

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

  const handleSendInvites = async () => {
    if (selectedFriends.size === 0) {
      Alert.alert(t('common.error'), t('group_errors.select_friends') || 'Please select at least one friend');
      return;
    }

    setLoading(true);
    try {
      const userIds = Array.from(selectedFriends);
      const payload = {
        userIds,
        message: message.trim() || undefined,
        expiresInHours,
      };

      const response = await sendInvites(conversationId, payload);
      const result = response.data || response;

      const { acceptedCount, skippedCount, inviteIds } = result;

      let successMessage = t('group_errors.invites_sent') || 'Invites sent successfully';
      successMessage += `\n${t('group_errors.accepted') || 'Accepted'}: ${acceptedCount}`;
      if (skippedCount > 0) {
        successMessage += `\n${t('group_errors.skipped') || 'Skipped'}: ${skippedCount}`;
      }

      Alert.alert(t('common.success'), successMessage);
      
      onInviteSent?.();
      onClose();
      
      // Reset form
      setSelectedFriends(new Set());
      setMessage('');
      setExpiresInHours(168);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('group_errors.invite_failed'));
    } finally {
      setLoading(false);
    }
  };

  const renderFriendItem = ({ friendId, fullName, avatarUrl, isMember }: { friendId: string; fullName: string; avatarUrl?: string | null; isMember?: boolean }) => {
    const isSelected = isFriendSelected(friendId);

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          {
            backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.card,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            opacity: isMember ? 0.5 : 1,
          },
        ]}
        onPress={() => !isMember && toggleFriendSelection(friendId)}
        activeOpacity={isMember ? 1 : 0.7}
        disabled={isMember}
      >
        <AvatarWithInitials
          name={fullName}
          size={44}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.friendName, { color: theme.colors.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          {isMember && (
            <Text style={[styles.memberLabel, { color: '#34C759' }]}>
              {t('chat_options.already_member') || 'Already a member'}
            </Text>
          )}
        </View>
        {!isMember && (
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
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.container, { backgroundColor: theme.colors.card }]}
          onPress={(e: any) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('group_errors.invite_to_group') || 'Invite to Group'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Group Name */}
          <View style={[styles.groupInfo, { backgroundColor: theme.colors.background }]}>
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
                  backgroundColor: theme.colors.background,
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
                      backgroundColor: expiresInHours === option.value ? theme.colors.primary : theme.colors.background,
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
              {selectedFriends.size} {t('group_errors.selected') || 'selected'} | Total: {friends.length}
            </Text>
          </View>

          <View style={[styles.friendsList, { backgroundColor: theme.colors.background }]}>
            {friendsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
                  {t('common.loading') || 'Loading friends...'}
                </Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
                  {t('group_errors.no_friends') || 'No friends found'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {friends.map((friend) => {
                  const isMember = existingMemberIds.includes(friend.id);
                  return (
                    <View key={friend.id} style={styles.friendItemWrapper}>
                      {renderFriendItem({
                        friendId: friend.id,
                        fullName: friend.fullName || '',
                        avatarUrl: friend.avatarUrl,
                        isMember,
                      })}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: selectedFriends.size > 0 && !loading ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={handleSendInvites}
              disabled={selectedFriends.size === 0 || loading}
            >
              {loading ? (
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
                    {t('group_errors.send_invites') || 'Send Invites'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
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
    flex: 1,
    marginBottom: 20,
    minHeight: 100,
    maxHeight: 300,
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
  },
  memberLabel: {
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
  footer: {
    flexDirection: 'row',
    gap: 12,
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
});

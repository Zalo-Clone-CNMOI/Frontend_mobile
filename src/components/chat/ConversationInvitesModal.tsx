import { useTheme } from '@/src/theme/themeContext';
import { X, Clock, Check, X as XIcon, AlertCircle, Filter } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { getConversationInvites, cancelInvite } from '@/src/services/conversationsApi';
import { GroupInviteDTO as Invite, GroupInviteStatus } from '@/src/types/dto/ApiDTO';

interface ConversationInvitesModalProps {
  visible: boolean;
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'expired';

export function ConversationInvitesModal({
  visible,
  conversationId,
  conversationName,
  onClose,
}: ConversationInvitesModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  useEffect(() => {
    if (visible) {
      fetchInvites();
    }
  }, [visible, statusFilter]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const response = await getConversationInvites(conversationId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
        page: 1,
      });
      const items = response.data?.data?.items || [];
      setInvites(items);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    Alert.alert(
      t('common.confirm'),
      t('group_errors.cancel_invite_confirm') || 'Are you sure you want to cancel this invite?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvite(conversationId, inviteId);
              Alert.alert(t('common.success'), 'Invite cancelled');
              fetchInvites();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || 'Failed to cancel invite');
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
        return <XIcon size={16} color={getStatusColor(status)} />;
      case 'expired':
        return <AlertCircle size={16} color={getStatusColor(status)} />;
      default:
        return null;
    }
  };

  const renderInviteItem = (invite: Invite) => {
    const isPending = invite.status === 'pending';
    
    return (
      <View style={[styles.inviteItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <AvatarWithInitials
          name={invite.inviter?.fullName || 'Unknown'}
          size={44}
        />
        <View style={styles.inviteContent}>
          <Text style={[styles.inviteName, { color: theme.colors.text }]}>
            {invite.inviter?.fullName || 'Unknown'}
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
          {isPending && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: '#FF3B30' }]}
              onPress={() => handleCancelInvite(invite.id)}
            >
              <XIcon size={16} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
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
              {t('group_errors.invite_center') || 'Group Invites'}
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

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: statusFilter === filter.key ? theme.colors.primary : theme.colors.background,
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : invites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
                {t('group_errors.no_history') || 'No invites'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.invitesList} showsVerticalScrollIndicator={false}>
              {invites.map((invite) => (
                <View key={invite.id}>{renderInviteItem(invite)}</View>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>
              {t('common.close') || 'Close'}
            </Text>
          </TouchableOpacity>
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
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
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
  invitesList: {
    flex: 1,
    marginBottom: 16,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

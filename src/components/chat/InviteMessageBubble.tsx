import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/themeContext';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { Clock, Check, X, AlertCircle, UserPlus, Users } from 'lucide-react-native';
import type { ChatMessage } from '@/src/types/chat';
import { GroupInviteDetailModal } from './GroupInviteDetailModal';

interface InviteMessageBubbleProps {
  item: ChatMessage;
  isMe: boolean;
  onAccept?: (inviteId: string) => void;
  onReject?: (inviteId: string) => void;
  onViewInvite?: (inviteId: string) => void;
}

export const InviteMessageBubble: React.FC<InviteMessageBubbleProps> = ({
  item,
  isMe,
  onAccept,
  onReject,
  onViewInvite,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Log received data
  useEffect(() => {
    console.log('=== InviteMessageBubble Received Data ===');
    console.log('item (ChatMessage):', JSON.stringify(item, null, 2));
    console.log('isMe:', isMe);
    console.log('onAccept:', typeof onAccept);
    console.log('onReject:', typeof onReject);
    console.log('onViewInvite:', typeof onViewInvite);
    console.log('metadata:', JSON.stringify(item.metadata, null, 2));
    console.log('metadata.message:', metadata?.message);
  }, [item, isMe, onAccept, onReject, onViewInvite, metadata?.message]);

  // Handle press on invite card - only open modal for pending invites
  const handlePress = () => {
    if (status === 'pending') {
      setShowDetailModal(true);
      return;
    }

    if (status === 'cancelled') {
      Alert.alert(
        t('group_errors.invite_cancelled_title') || 'Lời mời đã bị hủy',
        t('group_errors.invite_cancelled_message') || 'Lời mời này đã bị hủy bởi người gửi. Bạn không thể tham gia nhóm.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (status === 'accepted') {
      Alert.alert(
        t('group_errors.already_member') || 'Đã là thành viên',
        t('group_errors.already_joined') || 'Bạn đã tham gia nhóm này.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (status === 'rejected') {
      Alert.alert(
        t('group_errors.invite_rejected') || 'Đã từ chối lời mời',
        t('group_errors.already_rejected') || 'Bạn đã từ chối lời mời này.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (status === 'expired') {
      Alert.alert(
        t('group_errors.invite_expired') || 'Lời mời đã hết hạn',
        t('group_errors.expired_message') || 'Lời mời này đã hết hạn.',
        [{ text: 'OK' }]
      );
      return;
    }
  };

  // Extract invite metadata from message
  const metadata = item.metadata as {
    invite_id?: string;
    group_id?: string;
    group_name?: string;
    group_avatar_url?: string;
    inviter_id?: string;
    inviter_name?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
    invited_user_id?: string;
    member_count?: number;
    message?: string;
  } | undefined;

  const inviteId = metadata?.invite_id || item.id;
  const groupName = metadata?.group_name || item.text || t('group_errors.group');
  const inviterName = metadata?.inviter_name || item.senderName || t('group_errors.unknown');
  const memberCount = metadata?.member_count || 0;
  const inviteMessage = metadata?.message;
  const status = metadata?.status || 'pending';
  const isPending = status === 'pending';

  // Status helpers
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#FFD700';
      case 'accepted': return '#34C759';
      case 'rejected':
      case 'cancelled': return '#FF3B30';
      case 'expired': return '#8E8E93';
      default: return '#FFD700';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <Clock size={12} color="#fff" />;
      case 'accepted': return <Check size={12} color="#fff" />;
      case 'rejected':
      case 'cancelled': return <X size={12} color="#fff" />;
      case 'expired': return <AlertCircle size={12} color="#fff" />;
      default: return <Clock size={12} color="#fff" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return t('group_errors.filter_pending');
      case 'accepted': return t('group_errors.filter_accepted');
      case 'rejected': return t('group_errors.filter_rejected');
      case 'cancelled': return t('group_errors.cancelled');
      case 'expired': return t('group_errors.filter_expired');
      default: return status;
    }
  };

  // Zalo-style blue gradient card
  return (
    <>
      <View style={styles.wrapper}>
        {/* Main Blue Card */}
        <View style={styles.blueCard}>
          {/* Background decoration circles */}
          <View style={[styles.bgCircle, styles.bgCircle1]} />
          <View style={[styles.bgCircle, styles.bgCircle2]} />

          {/* Status Badge - Top Right */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            {getStatusIcon()}
            <Text style={styles.statusBadgeText}>{getStatusText()}</Text>
          </View>

          {/* Content Row */}
          <View style={styles.cardContent}>
            {/* Group Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                <AvatarWithInitials
                  name={groupName}
                  size={56}
                />
              </View>
            </View>

            {/* Text Content */}
            <View style={styles.textContent}>
              <Text style={styles.labelText}>
                {t('chat.group') || 'Nhóm'}
              </Text>
              <Text style={styles.groupNameText} numberOfLines={2}>
                {groupName}
              </Text>
              {memberCount > 0 && (
                <View style={styles.memberRow}>
                  <Users size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.memberCountText}>
                    {memberCount} {t('group_errors.members')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Info Section Below Card - Zalo Style */}
        <TouchableOpacity
          style={[styles.infoSection, { backgroundColor: theme.dark ? '#1C1C1E' : '#F8F9FA' }]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {/* zalo.me link style */}
          <Text style={[styles.zaloLink, { color: theme.colors.primary }]}>
            dev.me
          </Text>

          {/* Group name */}
          <Text style={[styles.infoGroupName, { color: theme.colors.text }]}>
            {groupName}
          </Text>

          {/* Description */}
          <Text style={[styles.infoDescription, { color: theme.colors.icon }]}>
            {t('group_errors.tap_to_join_zalo') || 'Bấm vào đây để tham gia nhóm trên Zalo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Invite Detail Modal */}
      <GroupInviteDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        groupId={metadata?.group_id || ''}
        groupName={groupName}
        inviteId={inviteId}
        memberCount={memberCount}
        inviterName={inviterName}
        inviteMessage={inviteMessage}
        status={status}
        onJoined={() => {
          setShowDetailModal(false);
          onAccept?.(inviteId);
        }}
        onRejected={() => {
          setShowDetailModal(false);
          onReject?.(inviteId);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Blue Gradient Card (Zalo style)
  blueCard: {
    backgroundColor: '#0068FF',
    padding: 16,
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  // Status Badge
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    zIndex: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadgePending: {
    backgroundColor: '#FFD700',
  },
  statusBadgeAccepted: {
    backgroundColor: '#34C759',
  },
  statusBadgeRejected: {
    backgroundColor: '#FF3B30',
  },
  statusBadgeExpired: {
    backgroundColor: '#8E8E93',
  },
  // Background decoration circles
  bgCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bgCircle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -20,
  },
  bgCircle2: {
    width: 80,
    height: 80,
    bottom: 10,
    right: 30,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  groupNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memberCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  // Info Section Below - Zalo Style
  infoSection: {
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  zaloLink: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  infoGroupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

import { useTheme } from '@/src/theme/themeContext';
import { Users, X, Calendar } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { acceptInvite, rejectInvite } from '@/src/services/conversationsApi';

interface GroupInviteDetailModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  inviteId: string;
  memberCount?: number;
  inviterName?: string;
  inviteMessage?: string | null;
  status?: string;
  onJoined?: () => void;
  onRejected?: () => void;
}

export function GroupInviteDetailModal({
  visible,
  onClose,
  groupId,
  groupName,
  inviteId,
  memberCount: memberCountProp,
  inviterName: inviterNameProp,
  inviteMessage,
  status,
  onJoined,
  onRejected,
}: GroupInviteDetailModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [joining, setJoining] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const memberCount = memberCountProp || 0;
  const creatorName = inviterNameProp || '';

  const handleJoin = async () => {
    setJoining(true);
    try {
      await acceptInvite(groupId, inviteId);
      Alert.alert(
        t('common.success') || 'Thành công',
        t('group_errors.joined_successfully') || 'Đã tham gia nhóm thành công'
      );
      onJoined?.();
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Lỗi',
        error.message || t('group_errors.join_failed') || 'Không thể tham gia nhóm'
      );
    } finally {
      setJoining(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await rejectInvite(groupId, inviteId);
      Alert.alert(
        t('common.success') || 'Thành công',
        t('group_errors.rejected_successfully') || 'Đã từ chối lời mời'
      );
      onRejected?.();
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Lỗi',
        error.message || t('group_errors.reject_failed') || 'Không thể từ chối lời mời'
      );
    } finally {
      setRejecting(false);
    }
  };

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
              {t('group_errors.view_group') || 'Thông tin nhóm'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Group Avatar */}
            <View style={styles.avatarSection}>
              <AvatarWithInitials name={groupName} size={80} />
            </View>

            {/* Group Name */}
            <Text style={[styles.groupName, { color: theme.colors.text }]}>
              {groupName}
            </Text>

            {/* Member Count */}
            {memberCount > 0 && (
              <View style={styles.infoRow}>
                <Users size={16} color={theme.colors.icon} />
                <Text style={[styles.infoText, { color: theme.colors.icon }]}>
                  {memberCount} {t('group_errors.members')}
                </Text>
              </View>
            )}

            {/* Created Info */}
            {creatorName ? (
              <View style={styles.infoRow}>
                <Calendar size={16} color={theme.colors.icon} />
                <Text style={[styles.infoText, { color: theme.colors.icon }]}>
                  {t('group_errors.invited_by')} {creatorName}
                </Text>
              </View>
            ) : null}

            {/* Invite Message from Inviter */}
            {inviteMessage && (
              <View style={[styles.messageSection, { backgroundColor: theme.colors.background + '40' }]}>
                <Text style={[styles.messageLabel, { color: theme.colors.icon }]}>
                  {t('group_errors.invite_message')}
                </Text>
                <Text style={[styles.messageText, { color: theme.colors.text }]}>
                  "{inviteMessage}"
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.rejectButton, { backgroundColor: theme.colors.border, borderWidth: 1, borderColor: theme.colors.icon }]}
                onPress={handleReject}
                disabled={rejecting || joining}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <Text style={[styles.rejectButtonText, { color: theme.colors.text }]}>{t('common.reject') || 'Từ chối'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleJoin}
                disabled={joining || rejecting}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinButtonText}>{t('group_errors.join')}</Text>
                )}
              </TouchableOpacity>
            </View>
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
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
  scrollContent: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  messageSection: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0068FF',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footer: {
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  joinButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  rejectButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

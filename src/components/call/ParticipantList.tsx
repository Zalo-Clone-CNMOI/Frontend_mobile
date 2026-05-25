import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react-native';
import { useCallStore } from '@/src/store/useCallStore';
import { getUserProfile } from '@/src/services/usersApi';
import type { CallParticipant } from '@/src/store/useCallStore';

interface ParticipantListProps {
  visible: boolean;
  onClose: () => void;
  participants: Record<string, CallParticipant>;
  localUserId: string;
}

export function ParticipantList({
  visible,
  onClose,
  participants,
  localUserId,
}: ParticipantListProps) {
  const userDisplayNames = useCallStore((s) => s.userDisplayNames);
  const setUserDisplayName = useCallStore((s) => s.setUserDisplayName);

  // Fetch display names for any participants we don't have names for
  useEffect(() => {
    if (!visible) return;
    Object.entries(participants).forEach(([uid]) => {
      if (!userDisplayNames[uid] && uid !== localUserId) {
        getUserProfile(uid).then((p) => {
          if (p) {
            setUserDisplayName(uid, p.fullName || p.nickname || uid);
          }
        }).catch(() => {});
      }
    });
  }, [visible, participants, userDisplayNames, localUserId, setUserDisplayName]);

  // Sort: local user first, then by name, then by userId
  const sortedEntries = Object.entries(participants)
    .filter(([uid]) => uid === localUserId || true)
    .sort(([aUid, a], [bUid, b]) => {
      if (aUid === localUserId) return -1;
      if (bUid === localUserId) return 1;
      const aName = userDisplayNames[aUid] || aUid;
      const bName = userDisplayNames[bUid] || bUid;
      return aName.localeCompare(bName);
    });

  const renderItem = ({
    item,
    index,
  }: {
    item: { userId: string; participant: CallParticipant };
    index: number;
  }) => {
    const { userId, participant } = item;
    const isLocal = userId === localUserId;
    const displayName = isLocal
      ? 'Bạn'
      : (userDisplayNames[userId] || userId.slice(0, 12));

    return (
      <View style={[styles.row, isLocal && styles.localRow]}>
        <View style={[styles.avatar, isLocal && styles.localAvatar]}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.status}>
            {participant.status === 'accepted'
              ? 'Đã tham gia'
              : participant.status === 'invited'
                ? 'Đang đổ chuông'
                : participant.status === 'left'
                  ? 'Đã rời'
                  : 'Đã từ chối'}
          </Text>
        </View>
        <View style={styles.icons}>
          {participant.audioEnabled !== undefined && (
            participant.audioEnabled ? (
              <Mic size={16} color="#34C759" />
            ) : (
              <MicOff size={16} color="#FF3B30" />
            )
          )}
          {participant.videoEnabled !== undefined && (
            participant.videoEnabled ? (
              <Video size={16} color="#34C759" />
            ) : (
              <VideoOff size={16} color="#FF3B30" />
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Thành viên ({Object.keys(participants).length})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sortedEntries.map(([userId, participant]) => ({
              userId,
              participant,
            }))}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>Không có thành viên nào</Text>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  localRow: {
    backgroundColor: 'rgba(52,199,89,0.05)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  localAvatar: {
    borderWidth: 1.5,
    borderColor: '#34C759',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  icons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    paddingVertical: 32,
    fontSize: 14,
  },
});

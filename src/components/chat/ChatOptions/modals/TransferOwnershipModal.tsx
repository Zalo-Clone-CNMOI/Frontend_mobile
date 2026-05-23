import { Crown, X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../styles';

interface Member {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}

interface TransferOwnershipModalProps {
  visible: boolean;
  theme: any;
  members: Member[];
  currentUserId?: string;
  onClose: () => void;
  onSelect: (member: Member) => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  visible,
  theme,
  members,
  currentUserId,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();

  const eligibleMembers = useMemo(
    () => members.filter((m) => m.userId !== currentUserId),
    [members, currentUserId]
  );

  const renderItem = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[styles.roleOption, { backgroundColor: theme.colors.background }]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.roleOptionLeft}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
          />
        ) : (
          <View
            style={[
              styles.roleIconContainer,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Crown size={20} color={theme.colors.primary} />
          </View>
        )}
        <View>
          <Text style={[styles.roleOptionText, { color: theme.colors.text }]}>
            {item.fullName}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.icon, marginTop: 2 }}>
            {item.role === 'admin' ? t('member_role.admin') : t('member_role.member')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.roleSelectionContainer, { backgroundColor: theme.colors.card, maxHeight: '70%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.roleSelectionHeader}>
            <Text style={[styles.roleSelectionTitle, { color: theme.colors.text }]}>
              {t('chat_options.transfer_ownership')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={{ paddingHorizontal: 20, paddingVertical: 8, color: theme.colors.icon, fontSize: 13 }}>
            {t('chat_options.transfer_ownership_desc')}
          </Text>

          <FlatList
            data={eligibleMembers}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            style={{ paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: theme.colors.icon, paddingVertical: 24 }}>
                {t('chat_options.no_eligible_members')}
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

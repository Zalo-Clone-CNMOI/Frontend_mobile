import { Search, Camera, Edit3, UserPlus, Palette, Bell, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';
import { GroupInfoModal } from '../GroupInfoModal';
import { getAvatarUrl } from '@/src/utils/groupMembers/avatarUrl';

interface ProfileSectionProps {
  theme: any;
  chatName: string;
  chatAvatar?: string | null;
  isGroup?: boolean;
  chatId?: string;
  myRole?: 'owner' | 'admin' | 'member';
  onSearchMessages?: () => void;
  onAddMember?: () => void;
  onChangeWallpaper?: () => void;
  onToggleNotifications?: () => void;
  onGroupInfoUpdated?: () => void;
  canEditGroupInfo?: boolean;
}

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=default';

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  theme,
  chatName,
  chatAvatar,
  isGroup,
  chatId,
  myRole = 'member',
  onSearchMessages,
  onAddMember,
  onChangeWallpaper,
  onToggleNotifications,
  onGroupInfoUpdated,
  canEditGroupInfo,
}) => {
  const { t } = useTranslation();
  const [editModalVisible, setEditModalVisible] = React.useState(false);

  const avatarUrl = getAvatarUrl(chatAvatar);

  const handleEditGroupInfo = () => {
    if (isGroup && chatId) {
      setEditModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setEditModalVisible(false);
  };

  const handleGroupInfoUpdated = () => {
    setEditModalVisible(false);
    onGroupInfoUpdated?.();
  };

  const canEditGroup = isGroup && (canEditGroupInfo ?? (myRole === 'owner' || myRole === 'admin'));
  const canAddMember = isGroup && (myRole === 'owner' || myRole === 'admin');

  return (
    <>
      <View style={[styles.profileSection, { backgroundColor: theme.colors.card }]}>
        <View style={styles.avatarContainer}>
          {isGroup && chatAvatar ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
          ) : isGroup ? (
            <View style={[styles.profileAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
              <Users size={40} color={theme.colors.primary} />
            </View>
          ) : (
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
          )}
          {canEditGroup && (
            <TouchableOpacity style={styles.cameraIcon} onPress={handleEditGroupInfo}>
              <Camera size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.nameContainer}>
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {chatName}
          </Text>
          {canEditGroup && (
            <TouchableOpacity style={styles.editIcon} onPress={handleEditGroupInfo}>
              <Edit3 size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem} onPress={onSearchMessages}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Search size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>
              {t('chat_options.search_messages')}
            </Text>
          </TouchableOpacity>

          {canAddMember && (
            <TouchableOpacity style={styles.quickActionItem} onPress={onAddMember}>
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <UserPlus size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>
                {t('chat_options.add_member')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.quickActionItem} onPress={onChangeWallpaper}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Palette size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>
              {t('chat_options.change_wallpaper')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={onToggleNotifications}>
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Bell size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>
              {t('chat_options.disable_notifications')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isGroup && chatId && (
        <GroupInfoModal
          visible={editModalVisible}
          onClose={handleModalClose}
          conversationId={chatId}
          currentName={chatName}
          currentAvatar={chatAvatar || null}
          myRole={myRole}
        />
      )}
    </>
  );
};

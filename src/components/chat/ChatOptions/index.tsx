import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import { Bell, BellOff, FileText, UserPlus, Settings, SettingsIcon } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaViewerModal } from '../MediaViewerModal';
import { ConversationInvitesModal } from '../ConversationInvitesModal';
import { CreatePollModal } from '../CreatePollModal';
import { ChatOptionsHeader } from './ChatOptionsHeader';
import { MediaSection } from './MediaSection';
import { MembersSection } from './MembersSection';
import { NicknameEditModal } from './modals/NicknameEditModal';
import { ProfileSection } from './ProfileSection';
import { RoleSelectionModal } from './modals/RoleSelectionModal';
import { useChatOptions } from './hooks/useChatOptions';
import { styles } from './styles';

interface ChatOptionsProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  chatAvatar?: string;
  currentUserId?: string;
  otherUserId?: string;
  isGroup?: boolean;
  isOwner?: boolean;
  memberCount?: number;
  onSearchMessages?: () => void;
  onViewProfile?: () => void;
  onChangeWallpaper?: () => void;
  onToggleNotifications?: (enabled: boolean) => void;
  onDeleteHistory?: () => void;
  onEditGroupInfo?: () => void;
  onAddMember?: () => void;
  onLeaveGroup?: () => void;
  onLeaveSuccess?: () => void;
  onViewMembers?: () => void;
  onChangeNickname?: () => void;
  onNicknameChanged?: () => void;
}

export const ChatOptions: React.FC<ChatOptionsProps> = ({
  visible,
  onClose,
  chatId,
  chatName,
  chatAvatar,
  currentUserId,
  isGroup,
  memberCount: memberCountProp = 0,
  onSearchMessages,
  onViewProfile,
  onChangeWallpaper,
  onToggleNotifications,
  onLeaveSuccess,
  onNicknameChanged,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const {
    notificationsEnabled,
    createPollModalVisible,
    conversationInvitesModalVisible,
    viewerVisible,
    viewerInitialIndex,
    roleSelectionVisible,
    members,
    memberCount,
    myRole,
    myNickname,
    media,
    canChangeGroupInfo,
    canCreatePoll,
    membersActions,
    nickname,
    setNotificationsEnabled,
    setCreatePollModalVisible,
    setConversationInvitesModalVisible,
    setViewerVisible,
    setRoleSelectionVisible,
    handleLeaveGroup,
    handleDisbandGroup,
    handleAddMember,
    handleViewMembers,
    handleViewAllMedia,
    handleMediaPress,
    handleViewPolls,
    handlePollCreated,
  } = useChatOptions({
    visible,
    chatId,
    chatName,
    currentUserId,
    isGroup,
    memberCountProp,
    onLeaveSuccess,
    onNicknameChanged,
  });

  const handleRoleChangePress = (member: any) => {
    membersActions.setSelectedMember(member);
    membersActions.setSelectedRole(member.role === 'admin' ? 'admin' : 'member');
    Alert.alert(
      t('member_role.change_role_title'),
      t('member_role.change_role_confirm', { name: member.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('member_role.confirm'),
          onPress: () => setRoleSelectionVisible(true),
        },
      ]
    );
  };

  const handleNicknameSave = async () => {
    await nickname.save(onNicknameChanged);
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ChatOptionsHeader theme={theme} onClose={onClose} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ProfileSection
            theme={theme}
            chatName={chatName}
            chatAvatar={chatAvatar}
            isGroup={isGroup}
            chatId={chatId}
            myRole={myRole}
            onSearchMessages={onSearchMessages}
            onAddMember={handleAddMember}
            onChangeWallpaper={onChangeWallpaper}
            onToggleNotifications={() => {
              setNotificationsEnabled(!notificationsEnabled);
              onToggleNotifications?.(!notificationsEnabled);
            }}
            onGroupInfoUpdated={onNicknameChanged}
            canEditGroupInfo={canChangeGroupInfo}
          />

          <MediaSection
            theme={theme}
            mediaItems={media.mediaItems}
            loading={media.loading}
            error={media.error}
            onViewAll={handleViewAllMedia}
            onMediaPress={handleMediaPress}
          />

          {isGroup && (
            <MembersSection
              theme={theme}
              members={members}
              memberCount={memberCount}
              canChangeRole={membersActions.canChangeRole}
              canRemoveMember={membersActions.canRemoveMember}
              onViewAll={() => handleViewMembers(onClose)}
              onChangeRole={handleRoleChangePress}
              onRemoveMember={membersActions.handleRemoveMember}
            />
          )}

          {/* Additional Options */}
          <View style={[styles.additionalOptions, { backgroundColor: theme.colors.card }]}>
            {/* Notifications */}
            <View style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.optionLeft}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary + '15',
                  }}
                >
                  {notificationsEnabled ? (
                    <Bell size={18} color={theme.colors.primary} />
                  ) : (
                    <BellOff size={18} color={theme.colors.icon} />
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                    {isGroup
                      ? t('chat_options.group_notifications')
                      : t('chat_options.disable_notifications')}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => {
                  setNotificationsEnabled(value);
                  onToggleNotifications?.(value);
                }}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary + '50' }}
                thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.card}
              />
            </View>

            {/* Create Poll (Group only) */}
            {isGroup && canCreatePoll && (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => setCreatePollModalVisible(true)}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary + '15',
                    }}
                  >
                    <FileText size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('chat_options.create_poll')}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.icon }]}>
                      {t('chat_options.create_poll_desc')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* View Polls (Group only) */}
            {isGroup && (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={handleViewPolls}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary + '15',
                    }}
                  >
                    <FileText size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('chat_options.view_polls')}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.icon }]}>
                      {t('chat_options.view_polls_desc')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Send Invites (Group only) */}
            {isGroup && myRole !== 'member' && (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => setConversationInvitesModalVisible(true)}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary + '15',
                    }}
                  >
                    <UserPlus size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('chat_options.send_invites')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Edit Nickname */}
            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
              onPress={nickname.openModal}
            >
              <View style={styles.optionLeft}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary + '15',
                  }}
                >
                  <Settings size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                    {t('chat_options.change_nickname')}
                  </Text>
                  {myNickname && (
                    <Text style={[styles.optionSubtitle, { color: theme.colors.icon }]}>
                      {myNickname}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Leave Group */}
            {isGroup && (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={handleLeaveGroup}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.colors.error + '15',
                    }}
                  >
                    <SettingsIcon size={18} color={theme.colors.error} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: theme.colors.error }]}>
                      {t('chat_options.leave_group')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Disband Group (Owner only) */}
            {isGroup && myRole === 'owner' && (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={handleDisbandGroup}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.colors.error + '15',
                    }}
                  >
                    <SettingsIcon size={18} color={theme.colors.error} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: theme.colors.error }]}>
                      {t('chat_options.delete_group')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Modals */}
        <RoleSelectionModal
          visible={roleSelectionVisible}
          theme={theme}
          selectedRole={membersActions.selectedRole}
          roleUpdating={membersActions.roleUpdating}
          memberName={membersActions.selectedMember?.fullName || ''}
          onClose={() => setRoleSelectionVisible(false)}
          onRoleChange={membersActions.setSelectedRole}
          onConfirm={membersActions.handleRoleChangeConfirm}
        />

        <NicknameEditModal
          visible={nickname.visible}
          theme={theme}
          value={nickname.input}
          updating={nickname.updating}
          onClose={nickname.closeModal}
          onChangeText={nickname.setInput}
          onSave={handleNicknameSave}
        />

        <MediaViewerModal
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          items={media.mediaItems.map(item => ({
            ...item,
            senderName: undefined,
            messageId: undefined,
          }))}
          initialIndex={viewerInitialIndex}
        />

        <ConversationInvitesModal
          visible={conversationInvitesModalVisible}
          onClose={() => setConversationInvitesModalVisible(false)}
          conversationId={chatId}
          conversationName={chatName}
        />

        <CreatePollModal
          visible={createPollModalVisible}
          onClose={() => setCreatePollModalVisible(false)}
          conversationId={chatId}
          onPollCreated={handlePollCreated}
        />
      </SafeAreaView>
    </Modal>
  );
};

export default ChatOptions;

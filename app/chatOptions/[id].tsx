import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import { Bell, BellOff, ChevronLeft, FileText, List } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaViewerModal } from '@/src/components/chat/MediaViewerModal';
import { ConversationInvitesModal } from '@/src/components/chat/ConversationInvitesModal';
import { CreatePollModal } from '@/src/components/chat/CreatePollModal';
import { MediaSection } from '@/src/components/chat/ChatOptions/MediaSection';
import { MembersSection } from '@/src/components/chat/ChatOptions/MembersSection';
import { NicknameEditModal } from '@/src/components/chat/ChatOptions/modals/NicknameEditModal';
import { ProfileSection } from '@/src/components/chat/ChatOptions/ProfileSection';
import { RoleSelectionModal } from '@/src/components/chat/ChatOptions/modals/RoleSelectionModal';
import { useChatOptions } from '@/src/components/chat/ChatOptions/hooks/useChatOptions';
import { styles as chatOptionsStyles } from '@/src/components/chat/ChatOptions/styles';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from '@/src/services/toastService';

export default function ChatOptionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { id: chatId, name: chatNameParam, isGroup: isGroupParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    isGroup?: string;
  }>();

  const chatName = chatNameParam || '';
  const isGroup = isGroupParam === 'true';

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
    chatAvatar,
    media,
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
    visible: true,
    chatId,
    chatName,
    currentUserId: authUser?.id,
    isGroup,
    memberCountProp: 0,
    onLeaveSuccess: () => {
      router.replace('/(tabs)/home');
    },
    onNicknameChanged: () => {
      toast.success(t('chat_options.nickname_updated'));
    },
  });

  const handleClose = () => {
    router.back();
  };

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
    await nickname.save(() => {
      toast.success(t('chat_options.nickname_updated'));
    });
  };

  const handleViewAllMembers = () => {
    router.push({
      pathname: '/groupMembers',
      params: {
        conversationId: chatId,
        chatName,
        currentUserId: authUser?.id,
        myRole: myRole,
      },
    });
  };

  return (
    <SafeAreaView style={[chatOptionsStyles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar style="light" backgroundColor={theme.colors.statusBar} />
      
      {/* Header */}
      <View style={[localStyles.header, { backgroundColor: theme.colors.statusBar }]}>
        <TouchableOpacity onPress={handleClose} style={localStyles.backButton}>
          <ChevronLeft size={28} color={theme.colors.iconHeader} />
        </TouchableOpacity>
        <Text style={[localStyles.headerTitle, { color: theme.colors.iconHeader }]}>
          {t('chat_options.title')}
        </Text>
        <View style={localStyles.placeholder} />
      </View>

      <ScrollView style={chatOptionsStyles.content} showsVerticalScrollIndicator={false}>
        <ProfileSection
          theme={theme}
          chatName={chatName}
          chatAvatar={chatAvatar}
          isGroup={isGroup}
          chatId={chatId}
          myRole={myRole}
          onSearchMessages={() => {}}
          onAddMember={handleAddMember}
          onChangeWallpaper={() => {}}
          onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
          onGroupInfoUpdated={() => {}}
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
            onViewAll={handleViewAllMembers}
            onChangeRole={handleRoleChangePress}
            onRemoveMember={membersActions.handleRemoveMember}
          />
        )}

        {/* Additional Options */}
        <View style={[chatOptionsStyles.additionalOptions, { backgroundColor: theme.colors.card }]}>
          {/* Notifications */}
          <View style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}>
            <View style={chatOptionsStyles.optionLeft}>
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
              <View style={chatOptionsStyles.optionTextContainer}>
                <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                  {isGroup
                    ? t('chat_options.group_notifications')
                    : t('chat_options.disable_notifications')}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => setNotificationsEnabled(value)}
              trackColor={{ false: '#767577', true: theme.colors.primary + '50' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : '#f4f3f4'}
            />
          </View>

          {/* Create Poll (Group only) */}
          {isGroup && (
            <TouchableOpacity
              style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => setCreatePollModalVisible(true)}
            >
              <View style={chatOptionsStyles.optionLeft}>
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
                <View style={chatOptionsStyles.optionTextContainer}>
                  <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                    {t('chat_options.create_poll')}
                  </Text>
                  <Text style={[chatOptionsStyles.optionSubtitle, { color: theme.colors.icon }]}>
                    {t('chat_options.create_poll_desc')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* View Polls (Group only) */}
          {isGroup && (
            <TouchableOpacity
              style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
              onPress={handleViewPolls}
            >
              <View style={chatOptionsStyles.optionLeft}>
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
                  <List size={18} color={theme.colors.primary} />
                </View>
                <View style={chatOptionsStyles.optionTextContainer}>
                  <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                    {t('chat_options.view_polls')}
                  </Text>
                  <Text style={[chatOptionsStyles.optionSubtitle, { color: theme.colors.icon }]}>
                    {t('chat_options.view_polls_desc')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Leave/Disband Group */}
        {isGroup && (
          <View style={[chatOptionsStyles.additionalOptions, { backgroundColor: theme.colors.card, marginTop: 16 }]}>
            {myRole === 'owner' ? (
              <TouchableOpacity
                style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  Alert.alert(
                    t('chat_options.disband_title'),
                    t('chat_options.disband_confirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('chat_options.disband'), style: 'destructive', onPress: handleDisbandGroup },
                    ]
                  );
                }}
              >
                <View style={chatOptionsStyles.optionLeft}>
                  <Text style={[chatOptionsStyles.optionTitle, { color: '#FF3B30' }]}>
                    {t('chat_options.disband_group')}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  Alert.alert(
                    t('chat_options.leave_title'),
                    t('chat_options.leave_confirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('chat_options.leave'), style: 'destructive', onPress: handleLeaveGroup },
                    ]
                  );
                }}
              >
                <View style={chatOptionsStyles.optionLeft}>
                  <Text style={[chatOptionsStyles.optionTitle, { color: '#FF3B30' }]}>
                    {t('chat_options.leave_group')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CreatePollModal
        visible={createPollModalVisible}
        onClose={() => setCreatePollModalVisible(false)}
        conversationId={chatId}
        onPollCreated={handlePollCreated}
      />

      {/* TODO: Fix ConversationInvitesModal props
      <ConversationInvitesModal
        visible={conversationInvitesModalVisible}
        onClose={() => setConversationInvitesModalVisible(false)}
        conversationId={chatId}
        conversationName={chatName}
      /> */}

      {/* TODO: Fix MediaViewerModal props
      <MediaViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        initialIndex={viewerInitialIndex}
        mediaItems={media.mediaItems}
        theme={theme}
      /> */}

      <NicknameEditModal
        visible={nickname.visible}
        theme={theme}
        value={nickname.input}
        updating={nickname.updating}
        onClose={nickname.closeModal}
        onChangeText={nickname.setInput}
        onSave={handleNicknameSave}
      />

      <RoleSelectionModal
        visible={roleSelectionVisible}
        selectedRole={membersActions.selectedRole}
        roleUpdating={membersActions.roleUpdating}
        memberName={membersActions.selectedMember?.fullName || ''}
        onRoleChange={membersActions.setSelectedRole}
        onClose={() => setRoleSelectionVisible(false)}
        onConfirm={membersActions.handleRoleChangeConfirm}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const localStyles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  placeholder: {
    width: 40,
  },
};

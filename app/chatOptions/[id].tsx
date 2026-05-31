import { useTheme } from '@/src/theme/themeContext';
import { Bell, BellOff, ChevronLeft, Crown, FileText, List, Pin, Search, Sparkles, UserPlus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaViewerModal } from '@/src/components/chat/MediaViewerModal';
import { CreatePollModal } from '@/src/components/chat/CreatePollModal';
import { MediaSection } from '@/src/components/chat/ChatOptions/MediaSection';
import { MembersSection } from '@/src/components/chat/ChatOptions/MembersSection';
import { NicknameEditModal } from '@/src/components/chat/ChatOptions/modals/NicknameEditModal';
import { ProfileSection } from '@/src/components/chat/ChatOptions/ProfileSection';
import { RoleSelectionModal } from '@/src/components/chat/ChatOptions/modals/RoleSelectionModal';
import { TransferOwnershipModal } from '@/src/components/chat/ChatOptions/modals/TransferOwnershipModal';
import { useChatOptions } from '@/src/components/chat/ChatOptions/hooks/useChatOptions';
import { GroupSettingsSection } from '@/src/components/chat/ChatOptions/GroupSettingsSection';
import { styles as chatOptionsStyles } from '@/src/components/chat/ChatOptions/styles';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from '@/src/services/toastService';
import { useChatsStore } from '@/src/store/useChatsStore';
import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { pinConversation, unpinConversation } from '@/src/services/conversationsApi';
import { runCatchUpSummary } from '@/src/services/ai/catchUpSummary';
import { SummaryModal } from '@/src/components/chat/SummaryModal';

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

  // Catch-up summary modal (replaces the old "post summary into Zai" flow)
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);

  const {
    notificationsEnabled,
    createPollModalVisible,
    viewerVisible,
    viewerInitialIndex,
    roleSelectionVisible,
    members,
    memberCount,
    myRole,
    myNickname,
    chatAvatar,
    media,
    canChangeGroupInfo,
    canCreatePoll,
    membersActions,
    nickname,
    setNotificationsEnabled,
    setCreatePollModalVisible,
    setViewerVisible,
    setRoleSelectionVisible,
    handleLeaveGroup,
    handleDisbandGroup,
    handleTransferOwnership,
    handleAddMember,
    transferOwnershipModalVisible,
    setTransferOwnershipModalVisible,
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

  // Pin conversation state and handler
  const updateConversationPinStatus = useChatsStore((state) => state.updateConversationPinStatus);
  const currentChat = useChatsStore((state) => state.chats.find((c) => c.conversationId === chatId));
  const isPinned = currentChat?.pinned || false;

  const handleTogglePinConversation = async () => {
    try {
      if (isPinned) {
        await unpinConversation(chatId);
        updateConversationPinStatus(chatId, false);
        toast.success(t('chat_options.unpin_success') || 'Đã bỏ ghim hội thoại');
      } else {
        await pinConversation(chatId);
        updateConversationPinStatus(chatId, true);
        toast.success(t('chat_options.pin_success') || 'Đã ghim hội thoại');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể thực hiện thao tác');
    }
  };

  // Show the AI catch-up summary in a modal.
  // (Previously this posted the summary into the Zai chat, which made Zai
  // re-summarize an already-finished summary. Now we just display it.)
  const handleSummaryChat = async () => {
    setSummaryModalVisible(true);
    // runCatchUpSummary handles its own errors (into the store); the extra catch
    // guards against an unhandled rejection escaping this onPress handler.
    await runCatchUpSummary(chatId).catch(() => {});
  };

  // Navigation debouncing state
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigateToInviteCenter = () => {
    if (isNavigating) return; // Prevent multiple navigation calls
    setIsNavigating(true);
    
    router.push({
      pathname: '/groupInviteCenter/[id]',
      params: { id: chatId, name: chatName },
    } as any);
    
    // Reset navigation flag after a delay
    setTimeout(() => setIsNavigating(false), 1000);
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
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary + '50' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.card}
            />
          </View>

          {/* Pin/Unpin Conversation */}
          <TouchableOpacity
            style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
            onPress={handleTogglePinConversation}
          >
            <View style={chatOptionsStyles.optionLeft}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isPinned ? `${theme.colors.primary}15` : theme.colors.primary + '15',
                }}
              >
                <Pin size={18} color={isPinned ? theme.colors.primary : theme.colors.primary} style={{ transform: [{ rotate: isPinned ? '45deg' : '0deg' }] }} />
              </View>
              <View style={chatOptionsStyles.optionTextContainer}>
                <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                  {isPinned ? (t('chat_options.unpin_conversation') || 'Bỏ ghim hội thoại') : (t('chat_options.pin_conversation') || 'Ghim hội thoại')}
                </Text>
                <Text style={[chatOptionsStyles.optionSubtitle, { color: theme.colors.icon }]}>
                  {isPinned
                    ? (t('chat_options.unpin_desc') || 'Hội thoại đã được ghim lên đầu danh sách')
                    : (t('chat_options.pin_desc') || 'Ghim hội thoại lên đầu danh sách')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Create Poll (Group only) */}
          {isGroup && canCreatePoll && (
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

          {/* Tóm tắt cuộc trò chuyện */}
          <TouchableOpacity
            style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
            onPress={handleSummaryChat}
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
                <Sparkles size={18} color={theme.colors.primary} />
              </View>
              <View style={chatOptionsStyles.optionTextContainer}>
                <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                  Tóm tắt
                </Text>
                <Text style={[chatOptionsStyles.optionSubtitle, { color: theme.colors.icon }]}>
                  Tóm tắt cuộc trò chuyện này
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Group Invites Center (Group only, admin/owner) - Invite and view invites */}
          {isGroup && myRole !== 'member' && (
            <TouchableOpacity
              style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
              onPress={handleNavigateToInviteCenter}
              disabled={isNavigating}
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
                  <UserPlus size={18} color={theme.colors.primary} />
                </View>
                <View style={chatOptionsStyles.optionTextContainer}>
                  <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.text }]}>
                    {t('chat_options.group_invites') || 'Group Invites'}
                  </Text>
                  <Text style={[chatOptionsStyles.optionSubtitle, { color: theme.colors.icon }]}>
                    {t('chat_options.group_invites_desc') || 'Invite members and view invites'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Group Settings Section - Only for groups, admin/owner can see */}
        {isGroup && (myRole === 'owner' || myRole === 'admin') && (
          <GroupSettingsSection
            theme={theme}
            conversationId={chatId}
            myRole={myRole}
          />
        )}

        {/* Leave/Disband Group */}
        {isGroup && (
          <View style={[chatOptionsStyles.additionalOptions, { backgroundColor: theme.colors.card, marginTop: 16 }]}>
            {myRole === 'owner' ? (
              <>
                <TouchableOpacity
                  style={[chatOptionsStyles.optionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => setTransferOwnershipModalVisible(true)}
                >
                  <View style={chatOptionsStyles.optionLeft}>
                    <Crown size={20} color={theme.colors.warning} style={{ marginRight: 12 }} />
                    <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.warning }]}>
                      {t('chat_options.transfer_ownership')}
                    </Text>
                  </View>
                </TouchableOpacity>
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
                    <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.error }]}>
                      {t('chat_options.disband_group')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
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
                  <Text style={[chatOptionsStyles.optionTitle, { color: theme.colors.error }]}>
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

      <TransferOwnershipModal
        visible={transferOwnershipModalVisible}
        theme={theme}
        members={members}
        currentUserId={authUser?.id}
        onClose={() => setTransferOwnershipModalVisible(false)}
        onSelect={(member) => {
          setTransferOwnershipModalVisible(false);
          handleTransferOwnership(member.userId, member.fullName);
        }}
      />

      <SummaryModal
        visible={summaryModalVisible}
        conversationId={chatId}
        onClose={() => setSummaryModalVisible(false)}
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

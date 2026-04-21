import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import { Bell, BellOff, ChevronLeft, ChevronRight, Crown, FileText, Play, Search, Settings, Shield, ShieldAlert, Trash2, User, UserPlus, Users, UserX, X, Check } from 'lucide-react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages } from '@/src/services/messagesApi';
import { getConversationDetail, leaveConversation, updateMember, removeMember } from '@/src/services/conversationsApi';
import { MediaViewerModal } from './MediaViewerModal';
import { useRouter } from 'expo-router';

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
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uri: string;
  thumbnail?: string;
  name: string;
  size: number;
  createdAt: string;
}

const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com';

export function ChatOptions({
  visible,
  onClose,
  chatId,
  chatName,
  chatAvatar,
  currentUserId,
  otherUserId,
  isGroup,
  isOwner,
  memberCount: memberCountProp = 0,
  onSearchMessages,
  onViewProfile,
  onChangeWallpaper,
  onToggleNotifications,
  onDeleteHistory,
  onEditGroupInfo,
  onAddMember,
  onLeaveGroup,
  onLeaveSuccess,
  onViewMembers,
}: ChatOptionsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const memberCount = memberCountProp;
  
  // Media states
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Media viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Members modal state
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [myRole, setMyRole] = useState<string>('member');
  const [myRoleLoaded, setMyRoleLoaded] = useState(false);

  // Role selection modal state
  const [roleSelectionVisible, setRoleSelectionVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const router = useRouter();

  // Reset myRoleLoaded when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setMyRoleLoaded(false);
      setMyRole('member');
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Fetch media when modal opens
      fetchConversationMedia();
      // Fetch conversation details to get my role
      if (isGroup) {
        fetchConversationDetails();
      }
    }
  }, [visible, chatId, isGroup]);

  // Fetch media from conversation messages
  const fetchConversationMedia = useCallback(async () => {
    if (!chatId || !currentUserId) return;
    
    setMediaLoading(true);
    setMediaError(null);
    
    try {
      // Fetch recent messages (limit 100 to find media)
      const response = await getMessages(chatId, 100);
      const messages = response.data?.items || [];
      
      // Extract attachments from messages
      const attachments: MediaItem[] = [];
      
      messages.forEach((msg: any) => {
        const msgAttachments = msg.attachments || msg.metadata?.attachments || [];
        
        msgAttachments.forEach((att: any, index: number) => {
          // Only include images and videos for the preview
          const type = att.type || getMediaTypeFromMime(att.content_type || att.mimeType);
          if (type === 'image' || type === 'video' || type === 'document') {
            attachments.push({
              id: `${msg.id || msg.messageId}-${index}`,
              type,
              uri: att.url || `${S3_BASE_URL}/${att.key}`,
              thumbnail: att.thumbnail_url || att.thumbnailUrl || att.url || `${S3_BASE_URL}/${att.key}`,
              name: att.name || 'file',
              size: att.size || 0,
              createdAt: msg.createdAt || msg.timestamp,
            });
          }
        });
      });
      
      // Sort by newest first
      attachments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Limit to first 20 for preview
      setMediaItems(attachments.slice(0, 20));
    } catch (error: any) {
      console.error('[ChatOptions] Failed to fetch media:', error);
      setMediaError(t('chat_options.media_error'));
    } finally {
      setMediaLoading(false);
    }
  }, [chatId, currentUserId, t]);
  
  // Helper to determine media type from MIME type
  const getMediaTypeFromMime = (mimeType?: string): MediaItem['type'] => {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };
  
  // Handle media item press
  const handleMediaPress = (item: MediaItem) => {
    const index = mediaItems.findIndex(m => m.id === item.id);
    setViewerInitialIndex(index >= 0 ? index : 0);
    setViewerVisible(true);
  };
  
  // Handle view all media
  const handleViewAllMedia = () => {
    router.push({
      pathname: '/media-gallery',
      params: {
        conversationId: chatId,
        chatName: chatName,
      },
    });
  };

  // Fetch conversation details (members)
  const fetchConversationDetails = useCallback(async () => {
    if (!chatId) return;

    setMembersLoading(true);
    try {
      console.log('[ChatOptions] Fetching conversation details for chatId:', chatId);
      const response = await getConversationDetail(chatId);
      console.log('[ChatOptions] API response:', response);
      const data = response.data?.data;
      if (data) {
        console.log('[ChatOptions] Members data:', data.members);
        console.log('[ChatOptions] mySettings:', data.mySettings);
        console.log('[ChatOptions] mySettings.role:', data.mySettings?.role);
        setMembers(data.members || []);
        const actualRole = data.mySettings?.role || 'member';
        setMyRole(actualRole);
        setMyRoleLoaded(true);
        console.log('[ChatOptions] Set myRole to:', actualRole, 'from API');
      } else {
        console.log('[ChatOptions] No data in response');
        setMyRoleLoaded(true);
      }
    } catch (error: any) {
      console.error('[ChatOptions] Failed to fetch conversation details:', error);
      setMyRoleLoaded(true);
    } finally {
      setMembersLoading(false);
    }
  }, [chatId]);

  // Handle view members - open modal and fetch data
  const handleViewMembers = () => {
    setMembersModalVisible(true);
    fetchConversationDetails();
  };

  // Handle leave group with direct API call
  const handleLeaveGroup = async () => {
    Alert.alert(
      isOwner ? t('chat_options.delete_group') : t('chat_options.leave_group'),
      isOwner
        ? t('chat_options.delete_group_confirm')
        : t('chat_options.leave_group_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isOwner ? t('chat_options.delete') : t('chat_options.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveConversation(chatId);
              onClose();
              onLeaveSuccess?.();
              router.back();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('chat_options.leave_group_failed'));
            }
          }
        }
      ]
    );
  };

  // Handle add member - navigate to createGroup screen with addMember mode
  const handleAddMember = () => {
    router.push({
      pathname: '/createGroup',
      params: {
        conversationId: chatId,
        mode: 'addMember',
      }
    } as any);
  };

  // Helper to get full avatar URL
  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return 'https://i.pravatar.cc/150?u=default';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    return `${S3_BASE_URL}/${avatarUrl}`;
  };

  // Handle role change confirm
  const handleRoleChangeConfirm = async () => {
    if (!selectedMember) return;

    const previousRole = selectedMember.role;
    console.log('[ChatOptions] Changing role for:', selectedMember.fullName, 'from:', previousRole, 'to:', selectedRole);
    setRoleUpdating(true);
    try {
      await updateMember(chatId, selectedMember.userId, { role: selectedRole });
      console.log('[ChatOptions] Role update successful');

      // Optimistically update the UI immediately
      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.userId === selectedMember.userId ? { ...m, role: selectedRole } : m
        )
      );

      Alert.alert(t('common.success'), t('member_role.role_updated'));
      setRoleSelectionVisible(false);

      // Fetch fresh data in background (non-blocking)
      fetchConversationDetails();
    } catch (error: any) {
      console.log('[ChatOptions] Role update failed:', error);

      // ROLLBACK: Revert to previous role
      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.userId === selectedMember.userId ? { ...m, role: previousRole } : m
        )
      );

      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setRoleUpdating(false);
    }
  };

  // Handle remove member
  const handleRemoveMemberPress = (item: any) => {
    Alert.alert(
      t('chat_options.remove_member'),
      t('chat_options.remove_member_confirm', { name: item.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat_options.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[ChatOptions] Removing member:', item.userId);
              await removeMember(chatId, item.userId);
              console.log('[ChatOptions] Member removed successfully');

              // Update UI - remove from list
              setMembers(prevMembers => prevMembers.filter(m => m.userId !== item.userId));

              Alert.alert(t('common.success'), t('chat_options.remove_member_success'));
            } catch (error: any) {
              console.log('[ChatOptions] Remove member failed:', error);
              Alert.alert(t('common.error'), error.message || t('chat_options.remove_member_failed'));
            }
          }
        }
      ]
    );
  };

  // Render member item
  const renderMemberItem = ({ item }: { item: any }) => {
    // Role permission logic - ONLY use myRole from backend API
    // Owner can: change any member's role (except other owners and self)
    // Admin can: no role change permission (matching backend)
    // Member can: no role change permission
    // Remove member permission: OWNER can remove ADMIN/MEMBER (except self/other owners)
    //                        ADMIN can remove MEMBER only (except self/admin/owner)
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';

    const canChangeRole = iAmOwner && !isSelf && !isOtherOwner;
    const canRemoveMember = (iAmOwner && !isSelf && !isOtherOwner) ||
                            (iAmAdmin && !isSelf && item.role === 'member');

    console.log('[ChatOptions] Member:', item.fullName, 'role:', item.role, 'canChangeRole:', canChangeRole, 'myRole:', myRole, 'currentUserId:', currentUserId);

    const handleRoleChange = () => {
      console.log('[ChatOptions] Opening role selection for:', item.fullName);
      setSelectedMember(item);
      setSelectedRole(item.role === 'admin' ? 'admin' : 'member');

      // Show confirmation dialog
      Alert.alert(
        t('member_role.change_role_title'),
        t('member_role.change_role_confirm', { name: item.fullName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('member_role.confirm'),
            onPress: () => setRoleSelectionVisible(true)
          }
        ]
      );
    };

    return (
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => canChangeRole && handleRoleChange()}
        disabled={!canChangeRole}
        activeOpacity={canChangeRole ? 0.7 : 1}
      >
        <Image
          source={{ uri: getAvatarUrl(item.avatarUrl) }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {item.fullName}
          </Text>
          <View style={styles.memberRoleContainer}>
            {item.role === 'owner' && (
              <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Crown size={12} color={theme.colors.primary} />
                <Text style={[styles.roleText, { color: theme.colors.primary }]}>{t('chat_options.role_owner')}</Text>
              </View>
            )}
            {item.role === 'admin' && (
              <View style={[styles.roleBadge, { backgroundColor: '#FF9500' + '20' }]}>
                <Shield size={12} color="#FF9500" />
                <Text style={[styles.roleText, { color: '#FF9500' }]}>{t('chat_options.role_admin')}</Text>
              </View>
            )}
            {item.role === 'member' && (
              <View style={[styles.roleBadge, { backgroundColor: theme.colors.icon + '20' }]}>
                <ShieldAlert size={12} color={theme.colors.icon} />
                <Text style={[styles.roleText, { color: theme.colors.icon }]}>{t('chat_options.role_member')}</Text>
              </View>
            )}
            {item.nickname && (
              <Text style={[styles.memberNickname, { color: '#8e8e93' }]}>
                @{item.nickname}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.memberActions}>
          {canChangeRole && (
            <Text style={[styles.changeRoleText, { color: theme.colors.primary }]}>{t('chat_options.change_role')}</Text>
          )}
          {canRemoveMember && (
            <TouchableOpacity
              onPress={() => handleRemoveMemberPress(item)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity 
      style={styles.mediaItem}
      onPress={() => handleMediaPress(item)}
      activeOpacity={0.8}
    >
      {item.type === 'video' && (
        <View style={styles.playIconContainer}>
          <Play size={24} color="#fff" fill="#fff" />
        </View>
      )}
      {item.type === 'document' && (
        <View style={[styles.documentIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <FileText size={32} color={theme.colors.primary} />
        </View>
      )}
      {item.type !== 'document' && (
        <Image 
          source={{ uri: item.thumbnail || item.uri }} 
          style={styles.mediaThumbnail}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  const OptionItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    showToggle = false,
    toggleValue = false,
    onToggleChange,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    showToggle?: boolean;
    toggleValue?: boolean;
    onToggleChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity
      style={[styles.optionItem, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
      onPress={showToggle ? undefined : onPress}
      activeOpacity={showToggle ? 1 : 0.7}
    >
      <View style={styles.optionLeft}>
        <Icon size={22} color={theme.colors.primary} />
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.optionSubtitle, { color: '#8e8e93' }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: '#e5e5ea', true: theme.colors.primary }}
          thumbColor="#fff"
        />
      ) : showArrow && (
        <ChevronRight size={20} color="#8e8e93" />
      )}
    </TouchableOpacity>
  );

  // Debug log - using myRole from API only
  const canAddMemberFromAPI = myRole === 'admin' || myRole === 'owner';
  console.log('[ChatOptions] Render - myRole (from API):', myRole, 'isGroup:', isGroup, 'canAddMember:', canAddMemberFromAPI);

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const query = memberSearchQuery.toLowerCase().trim();
    return members.filter(m => 
      (m.fullName || '').toLowerCase().includes(query) ||
      (m.nickname || '').toLowerCase().includes(query)
    );
  }, [members, memberSearchQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
        <StatusBar style="light" />
    
        <View style={[styles.header, { borderBottomColor: theme.colors.border }, {backgroundColor: theme.colors.statusBar}]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose}>
              <ChevronLeft size={28} color={theme.colors.iconHeader} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>{t('chat_options.title')}</Text>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScrollView style={styles.content}>
            
            <View style={styles.profileSection}>
              <Image
                source={{ uri: chatAvatar || 'https://i.pravatar.cc/150?u=default' }}
                style={styles.profileAvatar}
              />
              <Text style={[styles.profileName, { color: theme.colors.text }]}>{chatName}</Text>
              
              
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickActionItem} onPress={onSearchMessages}>
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Search size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.search_messages')}</Text>
                </TouchableOpacity>
                
                {!isGroup && (
                  <TouchableOpacity style={styles.quickActionItem} onPress={onViewProfile}>
                    <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <User size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.profile')}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.quickActionItem} onPress={() => {
                  setNotificationsEnabled(!notificationsEnabled);
                  onToggleNotifications?.(!notificationsEnabled);
                }}>
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                    {notificationsEnabled ? (
                      <Bell size={24} color={theme.colors.primary} />
                    ) : (
                      <BellOff size={24} color={theme.colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{t('chat_options.disable_notifications')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            
            {/* Group Options - Only show for group conversations */}
            {isGroup ? (
              <View style={[styles.additionalOptions, { backgroundColor: theme.colors.background }]}>
                {/* Group Info - Owner only (use myRole from API) */}
                {myRole === 'owner' && (
                  <OptionItem
                    icon={Settings}
                    title={t('chat_options.edit_group_info')}
                    onPress={onEditGroupInfo}
                  />
                )}
                
                {/* Group Members */}
                <OptionItem
                  icon={Users}
                  title={t('chat_options.group_members')}
                  subtitle={`${memberCount} ${t('chat_options.members')}`}
                  onPress={handleViewMembers}
                />
                
                {/* Add Member - Owner and Admin only */}
                {(myRole === 'admin' || myRole === 'owner') && (
                  <OptionItem
                    icon={UserPlus}
                    title={t('chat_options.add_member')}
                    onPress={handleAddMember}
                  />
                )}
                
                {/* Group Notifications */}
                <OptionItem
                  icon={notificationsEnabled ? Bell : BellOff}
                  title={t('chat_options.group_notifications')}
                  showToggle
                  toggleValue={notificationsEnabled}
                  onToggleChange={(value) => {
                    setNotificationsEnabled(value);
                    onToggleNotifications?.(value);
                  }}
                />
                
                {/* Leave Group */}
                <OptionItem
                  icon={UserX}
                  title={isOwner ? t('chat_options.delete_group') : t('chat_options.leave_group')}
                  onPress={handleLeaveGroup}
                />
              </View>
            ) : null}
            <View style={[styles.mediaSectionHeader, { borderTopColor: theme.colors.border }]}>

              <Text style={[styles.mediaSectionTitle, { color: theme.colors.text }]}>
                {t('chat_options.media_files_links')}
              </Text>
              {mediaItems.length > 0 && (
                <TouchableOpacity onPress={handleViewAllMedia}>
                  <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                    {t('common.view_all')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.mediaSection}>
              {mediaLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.mediaLoader} />
              ) : mediaError ? (
                <Text style={[styles.mediaErrorText, { color: theme.colors.icon }]}>
                  {mediaError}
                </Text>
              ) : mediaItems.length === 0 ? (
                <Text style={[styles.noMediaText, { color: theme.colors.icon }]}>
                  {t('chat_options.no_media')}
                </Text>
              ) : (
                <FlatList
                  data={mediaItems}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMediaItem}
                  contentContainerStyle={styles.mediaList}
                />
              )}
            </View>

            
            <View style={[styles.optionsSection, { backgroundColor: theme.colors.background }]}>
              <OptionItem
                icon={Trash2}
                title={t('chat_options.delete_history')}
                onPress={onDeleteHistory}
              />
            </View>
          </ScrollView>
        </View>

        {/* Media Viewer Modal */}
        <MediaViewerModal
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          items={mediaItems}
          initialIndex={viewerInitialIndex}
          conversationId={chatId}
        />

        {/* Members Modal */}
        <Modal
          visible={membersModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMembersModalVisible(false)}
        >
          <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
            <StatusBar style="light" />
            <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.statusBar }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                  <ChevronLeft size={28} color={theme.colors.iconHeader} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>{t('chat_options.group_members')}</Text>
              </View>
            </View>
            {/* Search input for members */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card }]}>
                <Search size={18} color={theme.colors.icon} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder={t('common.search') || 'Tìm kiếm...'}
                  placeholderTextColor={theme.colors.icon}
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                />
                {memberSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                    <X size={18} color={theme.colors.icon} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              {membersLoading ? (
                <View style={styles.membersLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : filteredMembers.length === 0 ? (
                <View style={styles.membersLoadingContainer}>
                  <Text style={[styles.noMembersText, { color: theme.colors.icon }]}>
                    {memberSearchQuery ? t('chat_options.no_search_results') || 'Không tìm thấy thành viên' : t('chat_options.no_members')}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredMembers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMemberItem}
                  contentContainerStyle={styles.membersList}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Role Selection Modal */}
        <Modal
          transparent
          visible={roleSelectionVisible}
          animationType="fade"
          onRequestClose={() => setRoleSelectionVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setRoleSelectionVisible(false)}>
            <View style={[styles.roleSelectionContainer, { backgroundColor: theme.colors.card }]}>
              <View style={styles.roleSelectionHeader}>
                <Text style={[styles.roleSelectionTitle, { color: theme.colors.text }]}>
                  {t('member_role.change_role_for', { name: selectedMember?.fullName })}
                </Text>
                <TouchableOpacity onPress={() => setRoleSelectionVisible(false)}>
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.roleSelectionContent}>
                {(['admin', 'member'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: selectedRole === role ? theme.colors.primary : theme.colors.border,
                        borderWidth: selectedRole === role ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      console.log('[ChatOptions] Selected role:', role);
                      setSelectedRole(role);
                    }}
                    disabled={roleUpdating}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roleOptionLeft}>
                      <View style={[
                        styles.roleIconContainer,
                        { backgroundColor: role === 'admin' ? '#FF9500' + '20' : theme.colors.icon + '20' }
                      ]}>
                        {role === 'admin' ? (
                          <Shield size={20} color="#FF9500" />
                        ) : (
                          <ShieldAlert size={20} color={theme.colors.icon} />
                        )}
                      </View>
                      <Text style={[styles.roleOptionText, { color: theme.colors.text }]}>
                        {role === 'admin' ? t('member_role.admin') : t('member_role.member')}
                      </Text>
                    </View>
                    {selectedRole === role && (
                      <View style={[styles.radioButton, { backgroundColor: theme.colors.primary }]}>
                        <Check size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.roleSelectionFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => setRoleSelectionVisible(false)}
                  disabled={roleUpdating}
                >
                  <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary, opacity: roleUpdating ? 0.5 : 1 }
                  ]}
                  onPress={handleRoleChangeConfirm}
                  disabled={roleUpdating}
                >
                  {roleUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 8,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
  additionalOptions: {
    marginTop: 8,
    marginBottom: 8,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  mediaSection: {
    paddingVertical: 16,
  },
  mediaList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  mediaItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaLoader: {
    paddingVertical: 20,
  },
  mediaErrorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  noMediaText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  documentIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  optionsSection: {
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  membersLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 14,
    textAlign: 'center',
  },
  membersList: {
    paddingVertical: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  memberNickname: {
    fontSize: 13,
    color: '#8e8e93',
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeRoleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roleSelectionContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  roleSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  roleSelectionContent: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelectionFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
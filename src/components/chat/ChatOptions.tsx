import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import { Bell, BellOff, ChevronLeft, ChevronRight, Crown, FileText, Play, Search, Settings, Trash2, User, UserPlus, Users, UserX } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages } from '@/src/services/messagesApi';
import { getConversationDetail, leaveConversation, updateMember } from '@/src/services/conversationsApi';
import { MediaViewerModal } from './MediaViewerModal';
import { MemberRoleModal } from './MemberRoleModal';
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
  const [myRole, setMyRole] = useState<string>('member');
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const router = useRouter();

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
        setMyRole(data.mySettings?.role || 'member');
        console.log('[ChatOptions] Set myRole to:', data.mySettings?.role || 'member');
      } else {
        console.log('[ChatOptions] No data in response');
      }
    } catch (error: any) {
      console.error('[ChatOptions] Failed to fetch conversation details:', error);
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

  // Handle role modal close and refresh members
  const handleRoleModalClose = () => {
    setRoleModalVisible(false);
    fetchConversationDetails();
  };

  // Helper to get full avatar URL
  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return 'https://i.pravatar.cc/150?u=default';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    return `${S3_BASE_URL}/${avatarUrl}`;
  };

  // Render member item
  const renderMemberItem = ({ item }: { item: any }) => {
    // Owner or admin can change roles (following Zalo logic)
    const canChangeRole = (isOwner || myRole === 'admin') && 
                          item.userId !== currentUserId && 
                          item.role !== 'owner' &&
                          (isOwner || item.role !== 'admin');
    
    return (
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => canChangeRole && setRoleModalVisible(true)}
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
                <Text style={[styles.roleText, { color: theme.colors.primary }]}>Owner</Text>
              </View>
            )}
            {item.role === 'admin' && (
              <Text style={[styles.adminText, { color: '#FF9500' }]}>Admin</Text>
            )}
            {item.nickname && (
              <Text style={[styles.memberNickname, { color: '#8e8e93' }]}>
                @{item.nickname}
              </Text>
            )}
          </View>
        </View>
        {canChangeRole && (
          <Text style={[styles.changeRoleText, { color: theme.colors.primary }]}>
            Change
          </Text>
        )}
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
          <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{title}</Text>
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
                {/* Group Info - Owner only */}
                {isOwner && (
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
                {(isOwner || myRole === 'admin') && (
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
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              {membersLoading ? (
                <View style={styles.membersLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : members.length === 0 ? (
                <View style={styles.membersLoadingContainer}>
                  <Text style={[styles.noMembersText, { color: theme.colors.icon }]}>
                    {t('chat_options.no_members')}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={members}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMemberItem}
                  contentContainerStyle={styles.membersList}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Member Role Modal */}
        <MemberRoleModal
          visible={roleModalVisible}
          onClose={handleRoleModalClose}
          conversationId={chatId}
          members={members}
          currentUserId={currentUserId || ''}
          isOwner={isOwner || false}
          myRole={myRole as 'owner' | 'admin' | 'member'}
        />
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
});
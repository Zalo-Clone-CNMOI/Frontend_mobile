import { useAuth } from '@/src/contexts/AuthContext';

import { useTheme } from '@/src/theme/themeContext';

import { Stack, useRouter, useLocalSearchParams } from 'expo-router';

import { Camera, Check, ChevronLeft, Search, X } from 'lucide-react-native';

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import {

  Alert,

  Image,

  KeyboardAvoidingView,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';

import { FlashList } from '@shopify/flash-list';

import { NETWORK_CONFIG } from '@/src/config/network';

import { createGroup, addMember, getConversationDetail } from '@/src/services/conversationsApi';

import { uploadMedia } from '@/src/services/mediaService';

import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';

import { useRealtimeStore } from '@/src/store/useRealtimeStore';

import { FriendRecord } from '@/src/types/realtimeBff';

import type { MediaFileInput } from '@/src/types/media';

// Normalize avatar URL from friend data (same as searchStore)
const normalizeAvatarUrl = (avatar?: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    // Replace bucket name if URL from backend uses wrong bucket
    return avatar.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
  }
  return NETWORK_CONFIG.S3_BASE_URL + '/' + avatar.replace(/^\//, '');
};



// Group member limit configuration

const GROUP_MEMBER_LIMIT = 200;



type Step = 'select_friends' | 'set_info';



interface SelectedFriend {

  id: string;

  fullName: string;

  avatarUrl?: string | null;

  phone?: string | null;

}



export default function CreateGroupScreen() {

  const theme = useTheme();

  const { t } = useTranslation();

  const router = useRouter();

  const { user: authUser } = useAuth();

  const friends = useRealtimeStore((state) => state.friends);

  const params = useLocalSearchParams<{ conversationId?: string; mode?: string }>();

  

  const mode = params.mode === 'addMember' ? 'addMember' : 'create';

  const conversationId = params.conversationId;



  const [currentStep, setCurrentStep] = useState<Step>('select_friends');

  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [groupName, setGroupName] = useState('');

  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<MediaFileInput | null>(null);

  const [loading, setLoading] = useState(false);

  const [existingMembers, setExistingMembers] = useState<any[]>([]);



  // Fetch existing group members when in addMember mode

  useEffect(() => {

    if (mode === 'addMember' && conversationId) {

      fetchExistingMembers();

    }

  }, [mode, conversationId]);



  const fetchExistingMembers = async () => {

    if (!conversationId) return;

    try {

      const response = await getConversationDetail(conversationId);

      const data = response.data?.data;

      if (data && data.members) {

        setExistingMembers(data.members);

      }

    } catch (error) {

      console.error('[CreateGroup] Failed to fetch existing members:', error);

    }

  };



  // Filter friends by search query and exclude existing members in addMember mode

  const filteredFriends = useMemo(() => {

    let filtered = friends;

    

    // Filter out friends who are already in the group when in addMember mode

    if (mode === 'addMember' && existingMembers.length > 0) {

      const existingMemberIds = existingMembers.map((m: any) => m.userId);

      filtered = filtered.filter((friend: FriendRecord) => !existingMemberIds.includes(friend.id));

    }

    

    // Apply search query filter

    if (searchQuery.trim()) {

      filtered = filtered.filter((friend: FriendRecord) =>

        (friend.fullName || '')?.toLowerCase().includes(searchQuery.toLowerCase()) ||

        friend.phone?.includes(searchQuery)

      );

    }

    

    return filtered;

  }, [friends, searchQuery, mode, existingMembers]);



  // Toggle friend selection

  const toggleFriendSelection = useCallback((friend: FriendRecord) => {

    setSelectedFriends((prev) => {

      const isSelected = prev.some((f) => f.id === friend.id);

      if (isSelected) {

        return prev.filter((f) => f.id !== friend.id);

      } else {

        return [...prev, {

          id: friend.id,

          fullName: friend.fullName || '',

          avatarUrl: normalizeAvatarUrl(friend.avatarUrl),

          phone: friend.phone,

        }];

      }

    });

  }, []);



  // Check if friend is selected

  const isFriendSelected = useCallback((friendId: string) => {

    return selectedFriends.some((f) => f.id === friendId);

  }, [selectedFriends]);



  // Remove selected friend

  const removeSelectedFriend = useCallback((friendId: string) => {

    setSelectedFriends((prev) => prev.filter((f) => f.id !== friendId));

  }, []);



  // Pick group avatar

  const handlePickAvatar = async () => {

    try {

      const result = await ImagePicker.launchImageLibraryAsync({

        mediaTypes: ['images' as ImagePicker.MediaType],

        allowsEditing: true,

        quality: 0.8,

        aspect: [1, 1],

      });



      if (!result.canceled && result.assets && result.assets.length > 0) {

        const asset = result.assets[0];

        setGroupAvatar(asset.uri);

        // Store file info for S3 upload

        setAvatarFile({

          uri: asset.uri,

          name: asset.fileName || 'group-avatar.jpg',

          mimeType: asset.mimeType || 'image/jpeg',

          size: asset.fileSize || 0,

        });

      }

    } catch (error) {

      Alert.alert(t('common.error'), t('create_group.avatar_error'));

    }

  };



  // Create group or add members to existing group

  const handleCreateGroup = async () => {

    if (selectedFriends.length < 1) {

      Alert.alert(t('common.error'), t('create_group.min_members_error'));

      return;

    }



    // Check group member limit in addMember mode

    if (mode === 'addMember' && conversationId) {

      const currentMemberCount = existingMembers.filter((m: any) => m.leftAt === null).length;

      const newMemberCount = selectedFriends.length;

      if (currentMemberCount + newMemberCount > GROUP_MEMBER_LIMIT) {

        Alert.alert(

          t('common.error'),

          t('create_group.group_limit_exceeded', { limit: GROUP_MEMBER_LIMIT })

        );

        return;

      }

    }



    setLoading(true);

    try {

      const memberIds = selectedFriends.map((f) => f.id);



      if (mode === 'addMember' && conversationId) {

        // Add members to existing group

        const payload = { memberIds };

        

        const response = await addMember(conversationId, payload);



        Alert.alert(t('common.success'), t('create_group.add_members_success'));

        router.back();

      } else {

        // Create new group

        if (!groupName.trim()) {

          Alert.alert(t('common.error'), t('create_group.name_required'));

          setLoading(false);

          return;

        }



        let avatarUrl: string | undefined;



        // Upload avatar to S3 if selected

        if (avatarFile && authUser?.id) {

          const uploadResult = await uploadMedia(avatarFile, authUser.id);

          // Use full S3 URL for backend @IsUrl validation

          avatarUrl = `${NETWORK_CONFIG.S3_BASE_URL}/${uploadResult.key}`;

        }



        const payload = {

          name: groupName.trim(),

          memberIds,

          ...(avatarUrl && { avatarUrl }),

        };



        const response = await createGroup(payload);



        const newConversationId = response?.data?.id || response?.data?.data?.id;



        // Fetch conversation details to check role

        if (newConversationId) {

          try {

            await getConversationDetail(newConversationId);

          } catch (error) {

            // Failed to fetch conversation details

          }

        }



        if (!newConversationId) {

          throw new Error('Invalid response: missing conversation ID');

        }



        Alert.alert(t('common.success'), t('create_group.success'));



        // Navigate to the new group chat

        router.replace({

          pathname: '/chat/[id]',

          params: {

            id: newConversationId,

            name: groupName.trim(),

          },

        });

      }

    } catch (error: any) {

      console.error('Group operation error:', error);



      // Map error codes to user-friendly messages

      let errorMessage = mode === 'addMember' ? t('create_group.add_members_error') : t('create_group.error');

      

      // Extract error message from various error structures

      const errorBody = error.data || error.error || error;

      const errorCode = errorBody?.code || errorBody?.errorCode;

      const rawMessage = errorBody?.message || error.message;



      // Map specific error codes to user-friendly messages

      if (errorCode) {

        switch (errorCode) {

          case 'CONVERSATION_NOT_FOUND':

            errorMessage = t('create_group.conversation_not_found');

            break;

          case 'CONVERSATION_INVALID_TYPE':

            errorMessage = t('create_group.invalid_conversation_type');

            break;

          case 'CONVERSATION_NOT_MEMBER':

            errorMessage = t('create_group.not_group_member');

            break;

          case 'CONVERSATION_PERMISSION_DENIED':

            errorMessage = t('create_group.permission_denied');

            break;

          case 'CONVERSATION_ALREADY_MEMBER':

            errorMessage = t('create_group.already_member');

            break;

          case 'USER_NOT_FOUND':

            errorMessage = t('create_group.user_not_found');

            break;

          case 'USER_NOT_ACTIVE':

            errorMessage = t('create_group.user_not_active');

            break;

          case 'GROUP_MEMBER_LIMIT_EXCEEDED':

            errorMessage = t('create_group.group_limit_exceeded', { limit: GROUP_MEMBER_LIMIT });

            break;

          default:

            errorMessage = rawMessage || errorMessage;

        }

      } else if (rawMessage && typeof rawMessage === 'string') {

        errorMessage = rawMessage;

      } else if (typeof error === 'string') {

        errorMessage = error;

      }



      // Handle object message case

      if (errorMessage === '[object Object]' || errorMessage.includes('[object Object]')) {

        try {

          const errorStr = JSON.stringify(error, null, 2);

          console.error('Error object:', errorStr);

          errorMessage = t('create_group.server_error');

        } catch {

          errorMessage = t('create_group.unknown_error');

        }

      }



      Alert.alert(

        t('common.error'),

        errorMessage,

        [{ text: 'OK' }]

      );

    } finally {

      setLoading(false);

    }

  };



  // Proceed to next step

  const handleNext = () => {

    if (selectedFriends.length < 1) {

      Alert.alert(t('common.error'), t('create_group.min_members_error'));

      return;

    }

    if (mode === 'addMember') {

      // In addMember mode, directly add members without setting group info

      handleCreateGroup();

    } else {

      setCurrentStep('set_info');

    }

  };



  // Go back

  const handleBack = () => {

    if (currentStep === 'set_info') {

      setCurrentStep('select_friends');

    } else {

      router.back();

    }

  };



  // Render friend item

  const renderFriendItem = ({ item }: { item: FriendRecord }) => {

    const isSelected = isFriendSelected(item.id);

    const friendName = item.fullName || '';

    const normalizedAvatarUrl = normalizeAvatarUrl(item.avatarUrl);

    return (

      <TouchableOpacity

        style={[

          styles.friendItem,

          { backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.card },

        ]}

        onPress={() => toggleFriendSelection(item)}

        activeOpacity={0.7}

      >

        {normalizedAvatarUrl ? (
          <Image source={{ uri: normalizedAvatarUrl }} style={styles.friendAvatar} />
        ) : (
          <AvatarWithInitials
            name={friendName}
            size={48}
          />
        )}

        <View style={styles.friendInfo}>

          <Text style={[styles.friendName, { color: theme.colors.text }]}>

            {friendName}

          </Text>

          <Text style={[styles.friendPhone, { color: theme.colors.icon }]}>

            {item.phone || ''}

          </Text>

        </View>

        <View style={[

          styles.checkbox,

          {

            borderColor: isSelected ? theme.colors.primary : theme.colors.border,

            backgroundColor: isSelected ? theme.colors.primary : 'transparent',

          },

        ]}>

          {isSelected && <Check size={16} color="#fff" />}

        </View>

      </TouchableOpacity>

    );

  };



  // Step 1: Select Friends

  const renderSelectFriendsStep = () => (

    <View style={styles.stepContainer}>

      {/* Search bar */}

      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>

        <Search size={20} color={theme.colors.icon} />

        <TextInput

          style={[styles.searchInput, { color: theme.colors.text }]}

          placeholder={t('create_group.search_friends')}

          placeholderTextColor={theme.colors.icon}

          value={searchQuery}

          onChangeText={setSearchQuery}

        />

        {searchQuery.length > 0 && (

          <TouchableOpacity onPress={() => setSearchQuery('')}>

            <X size={20} color={theme.colors.icon} />

          </TouchableOpacity>

        )}

      </View>



      {/* Selected friends chips */}

      {selectedFriends.length > 0 && (

        <View style={styles.selectedContainer}>

          <ScrollView

            horizontal

            showsHorizontalScrollIndicator={false}

            contentContainerStyle={styles.selectedList}

          >

            {selectedFriends.map((friend) => (

              <View

                key={friend.id}

                style={[styles.selectedChip, { backgroundColor: theme.colors.primary + '20' }]}

              >

                <Text style={[styles.selectedChipText, { color: theme.colors.primary }]}>

                  {friend.fullName}

                </Text>

                <TouchableOpacity

                  onPress={() => removeSelectedFriend(friend.id)}

                  style={styles.removeChipButton}

                >

                  <X size={14} color={theme.colors.primary} />

                </TouchableOpacity>

              </View>

            ))}

          </ScrollView>

        </View>

      )}



      {/* Friends list */}

      <FlashList

        data={filteredFriends}

        keyExtractor={(item: FriendRecord) => item.id}

        renderItem={renderFriendItem}

        contentContainerStyle={styles.listContent}

        ListEmptyComponent={

          <View style={styles.emptyContainer}>

            <Text style={[styles.emptyText, { color: theme.colors.icon }]}>

              {searchQuery ? t('create_group.no_results') : t('create_group.no_friends')}

            </Text>

          </View>

        }

      />



      {/* Bottom bar with count and next button */}

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>

        <Text style={[styles.selectedCount, { color: theme.colors.text }]}>

          {t('create_group.selected_count', { count: selectedFriends.length })}

        </Text>

        <TouchableOpacity

          style={[

            styles.nextButton,

            {

              backgroundColor: selectedFriends.length > 0 && !loading ? theme.colors.primary : theme.colors.border,

              opacity: loading ? 0.6 : 1,

            },

          ]}

          onPress={handleNext}

          disabled={selectedFriends.length === 0 || loading}

        >

          <Text style={[styles.nextButtonText, { color: '#fff' }]}>

            {loading && mode === 'addMember'

              ? t('common.adding') + '...'

              : mode === 'addMember'

              ? t('create_group.add_members')

              : t('common.next')}

          </Text>

        </TouchableOpacity>

      </View>

    </View>

  );



  // Step 2: Set Group Info

  const renderSetInfoStep = () => (

    <KeyboardAvoidingView

      behavior={Platform.OS === 'ios' ? 'padding' : undefined}

      style={styles.stepContainer}

    >

      <ScrollView style={styles.infoContainer}>

        {/* Group Avatar */}

        <View style={styles.avatarSection}>

          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>

            {groupAvatar ? (

              <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />

            ) : (

              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.background }]}>

                <Camera size={32} color={theme.colors.icon} />

              </View>

            )}

            <View style={[styles.cameraIcon, { backgroundColor: theme.colors.primary }]}>

              <Camera size={16} color="#fff" />

            </View>

          </TouchableOpacity>

          <Text style={[styles.avatarHint, { color: theme.colors.icon }]}>

            {t('create_group.add_avatar')}

          </Text>

        </View>



        {/* Group Name Input */}

        <View style={styles.nameSection}>

          <Text style={[styles.label, { color: theme.colors.text }]}>

            {t('create_group.group_name')}

          </Text>

          <TextInput

            style={[

              styles.nameInput,

              {

                backgroundColor: theme.colors.background,

                color: theme.colors.text,

                borderColor: theme.colors.border,

              },

            ]}

            placeholder={t('create_group.name_placeholder')}

            placeholderTextColor={theme.colors.icon}

            value={groupName}

            onChangeText={setGroupName}

            maxLength={50}

            autoFocus

          />

          <Text style={[styles.charCount, { color: theme.colors.icon }]}>

            {groupName.length}/50

          </Text>

        </View>



        {/* Selected Friends Preview */}

        <View style={styles.previewSection}>

          <Text style={[styles.label, { color: theme.colors.text }]}>

            {t('create_group.members', { count: selectedFriends.length + 1 })}

          </Text>

          <View style={styles.previewList}>

            {/* Current user */}

            <View style={styles.previewItem}>

              <AvatarWithInitials

                name={authUser?.name || 'Me'}

                size={40}

              />

              <Text style={[styles.previewName, { color: theme.colors.text }]} numberOfLines={1}>

                {t('create_group.you')}

              </Text>

            </View>

            {/* Selected friends */}

            {selectedFriends.map((friend) => (
              <View key={friend.id} style={styles.previewItem}>
                {friend.avatarUrl ? (
                  <Image source={{ uri: friend.avatarUrl }} style={styles.previewAvatar} />
                ) : (
                  <AvatarWithInitials
                    name={friend.fullName}
                    size={40}
                  />
                )}
                <Text style={[styles.previewName, { color: theme.colors.text }]} numberOfLines={1}>
                  {friend.fullName}
                </Text>
              </View>
            ))}

          </View>

        </View>

      </ScrollView>



      {/* Create Button */}

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>

        <TouchableOpacity

          style={[

            styles.createButton,

            {

              backgroundColor: groupName.trim() && !loading ? theme.colors.primary : theme.colors.border,

            },

          ]}

          onPress={handleCreateGroup}

          disabled={!groupName.trim() || loading}

        >

          {loading ? (

            <Text style={[styles.createButtonText, { color: '#fff' }]}>

              {t('common.creating')}...

            </Text>

          ) : (

            <Text style={[styles.createButtonText, { color: '#fff' }]}>

              {t('create_group.create')}

            </Text>

          )}

        </TouchableOpacity>

      </View>

    </KeyboardAvoidingView>

  );



  return (

    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>

      <Stack.Screen

        options={{

          headerShown: true,

          title: mode === 'addMember' ? t('create_group.add_members_title') : (currentStep === 'select_friends' ? t('create_group.title') : t('create_group.set_info')),

          headerStyle: { backgroundColor: theme.colors.statusBar },

          headerTintColor: theme.colors.textHeader,

          headerLeft: () => (

            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>

              <ChevronLeft size={28} color={theme.colors.textHeader} />

            </TouchableOpacity>

          ),

        }}

      />



      {currentStep === 'select_friends' ? renderSelectFriendsStep() : renderSetInfoStep()}

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

  },

  headerButton: {

    marginLeft: -8,

    padding: 8,

  },

  stepContainer: {

    flex: 1,

  },

  // Step 1: Select Friends

  searchContainer: {

    flexDirection: 'row',

    alignItems: 'center',

    margin: 16,

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: 8,

    gap: 8,

  },

  searchInput: {

    flex: 1,

    fontSize: 16,

    paddingVertical: 4,

  },

  selectedContainer: {

    maxHeight: 60,

    marginBottom: 8,

  },

  selectedList: {

    paddingHorizontal: 16,

    gap: 8,

  },

  selectedChip: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 16,

    gap: 6,

  },

  selectedChipText: {

    fontSize: 14,

    fontWeight: '500',

  },

  removeChipButton: {

    padding: 2,

  },

  listContent: {

    paddingHorizontal: 16,

  },

  friendItem: {

    flexDirection: 'row',

    alignItems: 'center',

    padding: 12,

    borderRadius: 8,

    marginBottom: 8,

  },

  friendAvatar: {

    width: 48,

    height: 48,

    borderRadius: 24,

    borderWidth: 1,

    borderColor: 'rgba(0, 0, 0, 0.1)',

  },

  friendInfo: {

    flex: 1,

    marginLeft: 12,

  },

  friendName: {

    fontSize: 16,

    fontWeight: '500',

  },

  friendPhone: {

    fontSize: 14,

    marginTop: 2,

  },

  checkbox: {

    width: 24,

    height: 24,

    borderRadius: 12,

    borderWidth: 2,

    justifyContent: 'center',

    alignItems: 'center',

  },

  emptyContainer: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 60,

  },

  emptyText: {

    fontSize: 16,

  },

  bottomBar: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    padding: 16,

    borderTopWidth: 0.5,

  },

  selectedCount: {

    fontSize: 16,

    fontWeight: '500',

  },

  nextButton: {

    paddingHorizontal: 24,

    paddingVertical: 12,

    borderRadius: 8,

  },

  nextButtonText: {

    fontSize: 16,

    fontWeight: '600',

  },

  // Step 2: Set Info

  infoContainer: {

    flex: 1,

    padding: 16,

  },

  avatarSection: {

    alignItems: 'center',

    marginBottom: 24,

  },

  avatarContainer: {

    position: 'relative',

    marginBottom: 8,

  },

  groupAvatar: {

    width: 80,

    height: 80,

    borderRadius: 40,

  },

  avatarPlaceholder: {

    width: 80,

    height: 80,

    borderRadius: 40,

    justifyContent: 'center',

    alignItems: 'center',

  },

  cameraIcon: {

    position: 'absolute',

    bottom: 0,

    right: 0,

    width: 28,

    height: 28,

    borderRadius: 14,

    justifyContent: 'center',

    alignItems: 'center',

  },

  avatarHint: {

    fontSize: 14,

  },

  nameSection: {

    marginBottom: 24,

  },

  label: {

    fontSize: 16,

    fontWeight: '600',

    marginBottom: 8,

  },

  nameInput: {

    height: 48,

    borderRadius: 8,

    paddingHorizontal: 16,

    fontSize: 16,

    borderWidth: 1,

    marginBottom: 4,

  },

  charCount: {

    fontSize: 12,

    alignSelf: 'flex-end',

  },

  previewSection: {

    marginBottom: 24,

  },

  previewList: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 16,

  },

  previewItem: {

    alignItems: 'center',

    width: 60,

  },

  previewAvatar: {

    width: 40,

    height: 40,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: 'rgba(0, 0, 0, 0.1)',

  },

  previewName: {

    fontSize: 12,

    marginTop: 4,

    textAlign: 'center',

  },

  createButton: {

    flex: 1,

    paddingVertical: 14,

    borderRadius: 8,

    alignItems: 'center',

  },

  createButtonText: {

    fontSize: 16,

    fontWeight: '600',

  },

});


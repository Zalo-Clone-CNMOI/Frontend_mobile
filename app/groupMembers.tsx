import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Crown, Search, Shield, ShieldAlert, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useConversationDetailStore } from '@/src/store/useConversationDetailStore';
import { useTheme } from '@/src/theme/themeContext';
import { removeMember, updateMember } from '@/src/services/conversationsApi';
import { NETWORK_CONFIG } from '@/src/config/network';

const S3_BASE_URL = NETWORK_CONFIG.S3_BASE_URL;
const EMPTY_MEMBERS: any[] = [];

interface Member {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  nickname?: string | null;
}

export default function GroupMembersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { conversationId, chatName, currentUserId, myRole: myRoleParam } = useLocalSearchParams<{
    conversationId: string;
    chatName: string;
    currentUserId: string;
    myRole: 'owner' | 'admin' | 'member';
  }>();

  const myRole = (myRoleParam || 'member') as 'owner' | 'admin' | 'member';

  const cacheEntry = useConversationDetailStore(
    (state) => state.cache[conversationId]
  );
  const members = useMemo(() => cacheEntry?.members || EMPTY_MEMBERS, [cacheEntry]);
  const storeFetchConversationDetail = useConversationDetailStore(
    (state) => state.fetchConversationDetail
  );
  const storeUpdateMember = useConversationDetailStore(
    (state) => state.updateMember
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Local optimistic state for role updates (Web pattern)
  const [localRoleUpdates, setLocalRoleUpdates] = useState<Record<string, 'admin' | 'member'>>({});

  // Cast members to proper type + apply local optimistic updates
  const typedMembers = useMemo(() => {
    const baseMembers = (members || []) as Member[];
    // Apply local role updates for optimistic UI
    return baseMembers.map(m => ({
      ...m,
      role: localRoleUpdates[m.userId] || m.role,
    }));
  }, [members, localRoleUpdates]);

  // Role selection modal state
  const [roleSelectionVisible, setRoleSelectionVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return typedMembers;
    const query = searchQuery.toLowerCase().trim();
    return typedMembers.filter((m) =>
      (m.fullName || '').toLowerCase().includes(query) ||
      (m.nickname || '').toLowerCase().includes(query)
    );
  }, [typedMembers, searchQuery]);

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return 'https://i.pravatar.cc/150?u=default';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    return `${S3_BASE_URL}/${avatarUrl}`;
  };

  const refreshMembers = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      await storeFetchConversationDetail(conversationId, true);
    } catch (error) {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [conversationId, storeFetchConversationDetail]);

  const handleRemoveMember = (item: Member) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';

    const canRemove = (iAmOwner && !isSelf && !isOtherOwner) ||
                      (iAmAdmin && !isSelf && item.role === 'member');

    if (!canRemove) {
      Alert.alert(t('common.error'), t('chat_options.no_permission'));
      return;
    }

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
              await removeMember(conversationId, item.userId);
              Alert.alert(t('common.success'), t('chat_options.remove_member_success'));
              refreshMembers();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('chat_options.remove_member_failed'));
            }
          }
        }
      ]
    );
  };

  const handleRoleChange = (item: Member) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';

    const canChangeRole = iAmOwner && !isSelf && !isOtherOwner;

    if (!canChangeRole) {
      return;
    }

    setSelectedMember(item);
    setSelectedRole(item.role === 'admin' ? 'admin' : 'member');

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

  const handleCloseRoleSelection = () => {
    setRoleSelectionVisible(false);
    setSelectedMember(null);
    setSelectedRole('member');
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedMember) return;

    setRoleUpdating(true);
    try {
      await updateMember(conversationId, selectedMember.userId, { role: selectedRole });

      // ✅ FIX: Optimistic update - update local state immediately (Web pattern)
      setLocalRoleUpdates(prev => ({
        ...prev,
        [selectedMember.userId]: selectedRole,
      }));

      // Also update store
      storeUpdateMember(conversationId, selectedMember.userId, { role: selectedRole });

      Alert.alert(t('common.success'), t('member_role.role_updated'));
      handleCloseRoleSelection();

      // Clear local update after background sync
      setTimeout(() => {
        setLocalRoleUpdates(prev => {
          const { [selectedMember.userId]: _, ...rest } = prev;
          return rest;
        });
      }, 3000);

      // Background refresh to ensure data consistency (silent - no UI blocking)
      setTimeout(async () => {
        try {
          await refreshMembers();
        } catch {
          // Silent fail - optimistic update already applied, this is just for sync
        }
      }, 500);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('member_role.update_failed'));
    } finally {
      setRoleUpdating(false);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isSelf = item.userId === currentUserId;
    const isOtherOwner = item.role === 'owner';
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';

    const canChangeRole = iAmOwner && !isSelf && !isOtherOwner;
    const canRemove = (iAmOwner && !isSelf && !isOtherOwner) ||
                      (iAmAdmin && !isSelf && item.role === 'member');

    return (
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => canChangeRole && handleRoleChange(item)}
        disabled={!canChangeRole}
        activeOpacity={canChangeRole ? 0.7 : 1}
      >
        <Image
          source={{ uri: getAvatarUrl(item.avatarUrl) }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {item.nickname || item.fullName}
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
          {canRemove && (
            <TouchableOpacity
              onPress={() => handleRemoveMember(item)}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={theme.colors.statusBar} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.statusBar }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>
            {t('chat_options.group_members')}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card }]}>
          <Search size={18} color={theme.colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('common.search') || 'Tìm kiếm...'}
            placeholderTextColor={theme.colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Members List */}
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.noMembersText, { color: theme.colors.icon }]}>
              {searchQuery ? t('chat_options.no_search_results') || 'Không tìm thấy thành viên' : t('chat_options.no_members')}
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

      {/* Role Selection Modal */}
      <Modal
        transparent
        visible={roleSelectionVisible}
        animationType="fade"
        onRequestClose={handleCloseRoleSelection}
      >
        <Pressable style={styles.overlay} onPress={handleCloseRoleSelection}>
          <View style={[styles.roleSelectionContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.roleSelectionHeader}>
              <Text style={[styles.roleSelectionTitle, { color: theme.colors.text }]}>
                {t('member_role.change_role_for', { name: selectedMember?.fullName })}
              </Text>
              <TouchableOpacity onPress={handleCloseRoleSelection}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.roleSelectionContent}>
              {(['admin', 'member'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedRole === role && { backgroundColor: theme.colors.primary + '10' },
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <View style={[styles.roleIconContainer, { backgroundColor: role === 'admin' ? '#FF9500' : theme.colors.icon }]}>
                    {role === 'admin' ? (
                      <Shield size={20} color="#fff" />
                    ) : (
                      <ShieldAlert size={20} color="#fff" />
                    )}
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={[styles.roleOptionTitle, { color: theme.colors.text }]}>
                      {role === 'admin' ? t('chat_options.role_admin') : t('chat_options.role_member')}
                    </Text>
                    <Text style={[styles.roleOptionDescription, { color: theme.colors.icon }]}>
                      {role === 'admin'
                        ? t('member_role.admin_description')
                        : t('member_role.member_description')}
                    </Text>
                  </View>
                  {selectedRole === role && (
                    <View style={[styles.checkContainer, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.roleSelectionFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={handleCloseRoleSelection}
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
                onPress={handleConfirmRoleChange}
                disabled={roleUpdating}
              >
                <Text style={styles.saveText}>
                  {roleUpdating ? t('common.updating') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 16,
  },
  membersList: {
    paddingHorizontal: 15,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberNickname: {
    fontSize: 13,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeRoleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  // Role Selection Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelectionContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  roleSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  roleSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  roleSelectionContent: {
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  roleOptionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleSelectionFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

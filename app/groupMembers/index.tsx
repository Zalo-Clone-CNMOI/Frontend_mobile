import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/theme/themeContext';
import { SearchBar } from '@/src/components/groupMembers/SearchBar';
import { MemberItem } from '@/src/components/groupMembers/MemberItem';
import { RoleSelectionModal } from '@/src/components/groupMembers/RoleSelectionModal';
import { useGroupMembers } from '@/src/hooks/groupMembers/useGroupMembers';
import { styles } from '@/src/components/groupMembers/styles';
import { toast } from '@/src/services/toastService';

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

  const {
    filteredMembers,
    searchQuery,
    setSearchQuery,
    loading,
    roleSelectionVisible,
    selectedMember,
    selectedRole,
    setSelectedRole,
    roleUpdating,
    removingMemberIds,
    handleRemoveMember,
    handleRoleChange,
    handleCloseRoleSelection,
    handleConfirmRoleChange,
    checkPermissions,
  } = useGroupMembers(conversationId, myRole, currentUserId);

  const handleRemoveMemberPress = async (member: any) => {
    const result = await handleRemoveMember(member);
    if (!result.success) {
      if (result.reason === 'no_permission') {
        toast.error(t('chat_options.no_permission'));
      } else {
        toast.error(t('chat_options.remove_member_failed'));
      }
    } else {
      toast.success(t('chat_options.remove_member_success'));
    }
  };

  const handleRoleChangeClick = (member: any) => {
    const canChange = handleRoleChange(member);
    if (!canChange) {
      return;
    }

    Alert.alert(
      t('member_role.change_role_title'),
      t('member_role.change_role_confirm', { name: member.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('member_role.confirm'),
          onPress: () => {}, // Modal is already shown by handleRoleChange
        }
      ]
    );
  };

  const renderMemberItem = ({ item }: { item: any }) => {
    const { canChangeRole, canRemove } = checkPermissions(item);
    const isRemoving = removingMemberIds.has(item.userId);

    return (
      <MemberItem
        member={item}
        currentUserId={currentUserId}
        onRoleChange={handleRoleChangeClick}
        onRemove={handleRemoveMemberPress}
        canChangeRole={canChangeRole}
        canRemove={canRemove}
        isRemoving={isRemoving}
        theme={theme}
      />
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
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>
              {t('chat_options.group_members')}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
      />

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
      <RoleSelectionModal
        visible={roleSelectionVisible}
        selectedMember={selectedMember}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onClose={handleCloseRoleSelection}
        onConfirm={async () => {
          const result = await handleConfirmRoleChange();
          if (result?.success) {
            toast.success(t('member_role.role_updated'));
          } else {
            toast.error(result?.reason || t('member_role.update_failed'));
          }
          return result || { success: false, reason: 'Unknown error' };
        }}
        isUpdating={roleUpdating}
        theme={theme}
      />
    </SafeAreaView>
  );
}

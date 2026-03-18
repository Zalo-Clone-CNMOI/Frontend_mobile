import { ContactsSearchHeader } from '@/src/components/contacts/ContactsSearchHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import conversationsApi from '@/src/services/conversationsApi';
import * as friendsApi from '@/src/services/friendsApi';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Cake, UserPlus, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/themeContext';

export default function ContactsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 50;
  const [activeTab, setActiveTab] = useState(0);
  const [usersFilterType, setUsersFilterType] = useState<'all' | 'recent'>('all');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const { t } = useTranslation();

  // Handle creating direct conversation
  const handleStartConversation = async (friendId: string, friendName: string) => {
    if (creatingConversation) return;
    
    setCreatingConversation(true);
    try {
      console.log('🔄 Starting conversation creation with friendId:', friendId, 'friendName:', friendName);
      const response = await conversationsApi.createDirect(friendId);
      console.log('📊 Full API response:', JSON.stringify(response, null, 2));
      
      const conversation = response?.data;
      console.log('📊 Conversation data:', JSON.stringify(conversation, null, 2));
      
      // Handle different response formats
      let conversationId = null;
      
      // Check nested data structure
      if (conversation?.data?.id) {
        conversationId = conversation.data.id;
        console.log('✅ Found conversation ID in conversation.data.id:', conversationId);
      } else if (conversation?.data?._id) {
        conversationId = conversation.data._id;
        console.log('✅ Found conversation ID in conversation.data._id:', conversationId);
      } else if (conversation?.data?.conversationId) {
        conversationId = conversation.data.conversationId;
        console.log('✅ Found conversation ID in conversation.data.conversationId:', conversationId);
      }
      // Check direct structure
      else if (conversation?.id) {
        conversationId = conversation.id;
        console.log('✅ Found conversation ID in conversation.id:', conversationId);
      } else if (conversation?._id) {
        conversationId = conversation._id;
        console.log('✅ Found conversation ID in conversation._id:', conversationId);
      } else if (conversation?.conversationId) {
        conversationId = conversation.conversationId;
        console.log('✅ Found conversation ID in conversation.conversationId:', conversationId);
      }
      
      if (conversationId) {
        console.log('🚀 Navigating to chat screen with ID:', conversationId);
        // Try different navigation methods
        try {
          // Method 1: router.push with object
          console.log('🔄 Trying router.push with object syntax...');
          router.push({ 
            pathname: '/chat/[id]', 
            params: { 
              id: conversationId, 
              name: friendName 
            } 
          });
        } catch (pushError) {
          console.warn('❌ router.push failed, trying router.navigate:', pushError);
          try {
            // Method 2: router.navigate
            console.log('🔄 Trying router.navigate...');
            router.navigate({
              pathname: '/chat/[id]',
              params: {
                id: conversationId,
                name: friendName
              }
            });
          } catch (navError) {
            console.warn('❌ router.navigate failed, trying string syntax:', navError);
            try {
              // Method 3: router.push with string
              console.log('🔄 Trying router.push with string syntax...');
              router.push(`/chat/${conversationId}?name=${encodeURIComponent(friendName)}`);
            } catch (stringError) {
              console.warn('❌ All navigation methods failed:', stringError);
              // Method 4: Fallback - just log the URL
              console.log('🔗 Manual navigation URL:', `/chat/${conversationId}?name=${encodeURIComponent(friendName)}`);
            }
          }
        }
      } else {
        console.error('❌ No conversation ID found in response');
        console.error('Available top-level fields:', Object.keys(conversation || {}));
        if (conversation?.data) {
          console.error('Available data fields:', Object.keys(conversation.data));
        }
        console.error('Full response structure:', JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      // Show error message to user
    } finally {
      setCreatingConversation(false);
    }
  };

  // Fetch friends from API
  const fetchFriends = async (opts: { page?: number; replace?: boolean } = {}) => {
    const p = opts.page || 1;
    if (!user?.tokens?.accessToken) return;

    if (opts.replace) setRefreshing(true);
    else setLoading(true);

    try {
      const resp = await friendsApi.getFriends({ page: p, limit: LIMIT });
      const data = resp?.data || {};

      if (resp.status >= 200 && resp.status < 300) {
        // Clear any previous errors
        setError(null);
        // Handle different response formats like search
        let friendsArray = [];
        if (Array.isArray(data)) {
          // Direct array format
          friendsArray = data;
        } else if (data && Array.isArray(data.data)) {
          // Wrapped object format (this is the current case!)
          friendsArray = data.data;
        } else if (data && Array.isArray(data.friends)) {
          // Alternative wrapped format
          friendsArray = data.friends;
        } else {
          // Fallback to any array-like property
          friendsArray = data || [];
        }
        
        const mappedFriends = Array.isArray(friendsArray)
          ? friendsArray.map((friend: any) => ({
              id: friend.id || friend._id,
              fullName: friend.fullName || friend.name || `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
              avatar: friend.avatarUrl || friend.avatar || 'https://i.pravatar.cc/200?u=' + (friend.id || Math.random()),
              status: friend.status || 'offline',
              phone: friend.phone || '',
              email: friend.email || '',
              bio: friend.bio || '',
              isOnline: friend.isOnline || friend.status === 'online',
              // Add additional fields from API
              lastSeenAt: friend.lastSeenAt,
              friendsSince: friend.friendsSince,
              mutualFriends: friend.mutualFriends || 0,
              friendType: friend.friendType || 'normal',
              friendStatus: friend.friendStatus || 'pending',
              friendCategory: friend.friendCategory || 'personal',
              friendRequestStatus: friend.friendRequestStatus || 'none',
              friendRequestSent: friend.friendRequestSent || false,
              friendRequestReceived: friend.friendRequestReceived || false,
              friendRequestMessage: friend.friendRequestMessage || '',
              friendRequestStatus: friend.friendRequestStatus || 'none',
              friendRequestSent: friend.friendRequestSent || false,
              friendRequestReceived: friend.friendRequestReceived || false,
              friendRequestMessage: friend.friendRequestMessage || '',
            }))
          : [];

        console.log('🔄 Mapped friends for UI:', mappedFriends);

        if (opts.replace || p === 1) {
          setFriends(mappedFriends);
        } else {
          setFriends((prev) => [...prev, ...mappedFriends]);
        }

        // set pagination
        const meta = data.meta || data.pagination || {};
        setHasNext(!!meta.hasNext || !!meta.has_next || (meta.page && meta.totalPages ? meta.page < meta.totalPages : false));
        setPage(p);
      } else {
        console.error('Failed to fetch friends:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      // Show error state or empty state
      setFriends([]);
      setHasNext(false);
      setError('Network connection failed. Please check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const tabs = [t('contacts.friends'), t('contacts.createGroup'), t('contacts.oa')];

  useEffect(() => {
    fetchFriends({ page: 1, replace: true });
  }, []);

  const onRefresh = useCallback(() => fetchFriends({ page: 1, replace: true }), []);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchFriends({ page: 1, replace: true });
  }, []);

  const loadMore = useCallback(() => {
    if (!hasNext || loading) return;
    fetchFriends({ page: page + 1 });
  }, [hasNext, loading, page]);

  // Filter friends based on type
  const getFilteredFriends = () => {
    if (usersFilterType === 'recent') {
      return friends.filter((friend: any) => friend.isOnline || friend.status === 'online');
    }
    return friends;
  };

  const ContactItem = React.memo(function ContactItem({ item }: any) {
    const theme = useTheme();
    // Handle both v2 (from API) and legacy contact formats
    const isV2 = !!item.fullName;
    const isOnline = isV2 ? item.status === 'online' : item.subtitle === 'Đang hoạt động';
    const title = isV2 ? item.fullName : item.name;
    const subtitle = isV2 ? (
      item.isOnline ? t('contacts.online') : t('contacts.offline')
    ) : item.subtitle;

    return (
      <TouchableOpacity 
        style={[styles.row, { backgroundColor: theme.colors.card }]} 
        activeOpacity={0.7}
        onPress={() => handleStartConversation(item.id, title)}
        disabled={creatingConversation}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {isOnline ? <View style={[styles.onlineDot, { borderColor: theme.colors.background }]} /> : null}
        </View>

        <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.textWrapper}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: '#8E8E93' }]} numberOfLines={1}>
              {subtitle}
            </Text>
            {item.phone && (
              <Text style={[styles.phone, { color: '#8E8E93' }]} numberOfLines={1}>
                📱 {item.phone}
              </Text>
            )}
            {item.friendsSince && (
              <Text style={[styles.friendsSince, { color: '#8E8E93' }]} numberOfLines={1}>
                🤝 Friends since {new Date(item.friendsSince).toLocaleDateString()}
              </Text>
            )}
          </View>
          {creatingConversation && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  });

  ContactItem.displayName = 'ContactItem';

  const renderListHeader = () => {
    if (activeTab === 0) {
      return (
        <View style={styles.staticMenu}>
          <MenuOption icon={<Users size={22} color="#fff" />} title={t('contacts.friendRequests')} />
          <MenuOption icon={<Cake size={22} color="#fff" />} title={t('contacts.birthdays')} />

          <View style={[styles.dividerSection, { backgroundColor: theme.colors.dividerSection }]} />

          <View style={styles.filterChipContainer}>
              <FilterChip
                label={t('contacts.all')}
                count={friends.length}
                isActive={usersFilterType === 'all'}
                onPress={() => setUsersFilterType('all')}
              />
              <View style={{ width: 10 }} />
              <FilterChip
                label={t('contacts.recent')}
                count={friends.filter((u: any) => u.isOnline || u.status === 'online').length}
                isActive={usersFilterType === 'recent'}
                onPress={() => setUsersFilterType('recent')}
              />
          </View>
        </View>
      );
    }
    if (activeTab === 1) {
      return (
        <View style={styles.staticMenu}>
          <MenuOption icon={<UserPlus size={22} color="#fff" />} title={t('contacts.createGroup')} />
          <View style={[styles.dividerSection, { backgroundColor: theme.colors.dividerSection }]} />
          <View
            style={styles.chip}
          >
            <Text style={[ { color: theme.colors.text }]}>{t('contacts.joinedGroups')} (0)</Text>
          </View>
        </View>
      )
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
    <StatusBar style="light" />
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ContactsSearchHeader onPressSearch={() => router.push('/search')} />
      <View style={[styles.tabWrapper, { borderBottomColor: theme.colors.border }]}>
        {tabs.map((tab, index) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(index)} style={styles.tabItem}>
            <Text style={[styles.tabText, { color: activeTab === index ? theme.colors.text : '#8E8E93' }, activeTab === index && styles.activeTabText]}>{tab}</Text>
            {activeTab === index && <View style={[styles.activeLine, { backgroundColor: theme.colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>
      <FlashList
        data={activeTab === 0 ? getFilteredFriends() : []}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={renderListHeader}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          <View style={{ padding: 12, alignItems: 'center' }}>
            {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: 'center' }}>
            {error ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={handleRetry}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <Text style={{ color: theme.colors.text }}>{t('contacts.empty') || 'No contacts yet'}</Text>
              )
            )}
          </View>
        )}
        renderItem={({ item }: any) => <ContactItem item={item} />}
      />
    </View>
    </SafeAreaView>
  );
}

const MenuOption = ({ icon, title }: any) => {
  const theme = useTheme();
  return (
    <TouchableOpacity style={[styles.staticItem, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>{React.isValidElement(icon) ? icon : <Text style={styles.staticText}>{String(icon)}</Text>}</View>
      <Text style={[styles.staticText, { color: theme.colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const FilterChip = ({ label, count, isActive, onPress }: any) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[styles.chip, isActive ? [styles.activeChip, { backgroundColor: theme.colors.card }] : [styles.inactiveChip, { borderColor: theme.colors.border }]]}
      onPress={onPress}
    >
      <Text style={[isActive ? styles.activeChipText : styles.inactiveChipText, { color: isActive ? theme.colors.text : '#8e8e93' }]}>{label}</Text>
      <Text style={[styles.activeChipCount, { color: isActive ? theme.colors.text : '#8e8e93' }]}>({count})</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
        flex: 1, 
    },
  container: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarContainer: {
    position: 'relative', // Quan trọng để chấm xanh căn theo avatar
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Màu xanh lá hoạt động
    borderWidth: 2,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row', // Để chữ và icon call nằm ngang
    alignItems: 'center',
    marginLeft: 15,
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
  textWrapper: {
    flex: 1, // Để phần chữ chiếm hết khoảng trống giữa
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  phone: {
    fontSize: 12,
    marginTop: 2,
  },
  friendsSince: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  loadingIndicator: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
  callButton: {
    padding: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  activeLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  specialActions: {
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  tabItem: {
    paddingVertical: 15,
    marginRight: 30, // Khoảng cách giữa các chữ
    position: 'relative',
  },
  staticMenu: {
  },
  staticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerGroup: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staticTextContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  staticText: {
    fontSize: 16,
    fontWeight: '400',
    marginHorizontal: 10,
  },
  dividerSection: {
    height: 8,
    marginVertical: 4,
  },
  filterChipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25, // Tạo hình con nhộng tròn trịa
  },
  activeChip: {
  },
  inactiveChip: {
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inactiveChipText: {
    fontSize: 15,
  },
  ChipTextGroup:{
    fontSize: 15,
  },
  activeChipCount: {
    fontSize: 15,
    marginLeft: 6,
  },
});

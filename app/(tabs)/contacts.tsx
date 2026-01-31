import { ContactsSearchHeader } from '@/src/components/contacts/ContactsSearchHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiCallWithRefresh } from '@/src/services/authService';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Cake, Phone, UserPlus, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/themeContext';

export default function ContactsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [usersFilterType, setUsersFilterType] = useState<'all' | 'recent'>('all');
  const { t } = useTranslation();

  // Fetch friends from API
  const fetchFriends = async () => {
    if (!user?.tokens?.accessToken) return;
    
    setLoading(true);
    try {
      const response = await apiCallWithRefresh('http://175.41.136.189:5000/api/friends', {
        method: 'GET',
        headers: {
          'userId': user.id || '',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Friends data:', data);
        // Map API response to expected format
        const friendsArray = data.data || data.friends || data || [];
        const mappedFriends = Array.isArray(friendsArray) ? friendsArray.map((friend: any) => ({
          id: friend.id || friend._id,
          fullName: friend.fullName || friend.name || `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
          avatar: friend.avatarUrl || friend.avatar || 'https://i.pravatar.cc/200?u=' + (friend.id || Math.random()),
          status: friend.status || 'offline',
          phone: friend.phone || '',
          email: friend.email || '',
          bio: friend.bio || '',
          isOnline: friend.isOnline || friend.status === 'online',
        })) : [];
        
        setFriends(mappedFriends);
      } else {
        console.error('Failed to fetch friends:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [t('contacts.friends'), t('contacts.createGroup'), t('contacts.oa')];

  useEffect(() => {
    fetchFriends();
  }, []);

  // Filter friends based on type
  const getFilteredFriends = () => {
    if (usersFilterType === 'recent') {
      return friends.filter((friend: any) => friend.isOnline || friend.status === 'online');
    }
    return friends;
  };


  const ContactItem = React.memo(function ContactItem({ item }: any) {
    const theme = useTheme();
    // item can be UserV2 or legacy Contact
    const isV2 = !!item.fullName;
    const isOnline = isV2 ? item.status === 'online' : item.subtitle === 'Đang hoạt động';
    const title = isV2 ? item.fullName : item.name;
    const subtitle = isV2 ? (item.status === 'online' ? t('contacts.online') : t('contacts.offline')) : item.subtitle;

    return (
      <TouchableOpacity style={[styles.row, { backgroundColor: theme.colors.background }]} activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {isOnline ? <View style={[styles.onlineDot, { borderColor: theme.colors.background }]} /> : null}
        </View>

        <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.textWrapper}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{item.fullName}</Text>
            <Text style={[styles.subtitle, { color: '#8E8E93' }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          {activeTab === 0 && (
            <TouchableOpacity style={styles.callButton}>
              <Phone size={20} color="#8E8E93" />
            </TouchableOpacity>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
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

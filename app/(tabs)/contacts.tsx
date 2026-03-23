import { ContactsSearchHeader } from '@/src/components/contacts/ContactsSearchHeader';
import { useContactsScreenLogic } from '@/src/hooks/screens/useContactsScreen';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Cake, UserPlus, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/themeContext';

export default function ContactsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    activeTab,
    creatingConversation,
    error,
    filteredFriends,
    friends,
    handleRetry,
    handleStartConversation,
    loading,
    loadMore,
    onRefresh,
    refreshing,
    setActiveTab,
    setUsersFilterType,
    usersFilterType,
  } = useContactsScreenLogic();

  const tabs = [t('contacts.friends'), t('contacts.createGroup'), t('contacts.oa')];

  const ContactItem = React.memo(function ContactItem({ item }: any) {
    const itemTheme = useTheme();
    const isOnline = item.status === 'online' || item.isOnline;
    const title = item.fullName || item.name;
    const subtitle = item.isOnline ? t('contacts.online') : t('contacts.offline');

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: itemTheme.colors.card }]}
        activeOpacity={0.7}
        onPress={() => handleStartConversation(item.id, title)}
        disabled={creatingConversation}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {isOnline ? <View style={[styles.onlineDot, { borderColor: itemTheme.colors.background }]} /> : null}
        </View>

        <View style={[styles.rowContent, { borderBottomColor: itemTheme.colors.border }]}>
          <View style={styles.textWrapper}>
            <Text style={[styles.name, { color: itemTheme.colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: '#8E8E93' }]} numberOfLines={1}>
              {subtitle}
            </Text>
            {item.phone ? (
              <Text style={[styles.phone, { color: '#8E8E93' }]} numberOfLines={1}>
                {item.phone}
              </Text>
            ) : null}
            {item.friendsSince ? (
              <Text style={[styles.friendsSince, { color: '#8E8E93' }]} numberOfLines={1}>
                Friends since {new Date(item.friendsSince).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
          {creatingConversation ? (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={itemTheme.colors.primary} />
            </View>
          ) : null}
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
          <View style={styles.chip}>
            <Text style={[{ color: theme.colors.text }]}>{t('contacts.joinedGroups')} (0)</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ContactsSearchHeader onPressSearch={() => router.push('/search')} />
        <View style={[styles.tabWrapper, { borderBottomColor: theme.colors.border }]}>
          {tabs.map((tab, index) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(index)} style={styles.tabItem}>
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === index ? theme.colors.text : '#8E8E93' },
                  activeTab === index && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
              {activeTab === index ? <View style={[styles.activeLine, { backgroundColor: theme.colors.primary }]} /> : null}
            </TouchableOpacity>
          ))}
        </View>

        <FlashList
          data={activeTab === 0 ? filteredFriends : []}
          keyExtractor={(item: any) => item.id}
          ListHeaderComponent={renderListHeader}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            <View style={{ padding: 12, alignItems: 'center' }}>
              {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              {error ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
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
              ) : loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <Text style={{ color: theme.colors.text }}>{t('contacts.empty') || 'No contacts yet'}</Text>
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
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
        {React.isValidElement(icon) ? icon : <Text style={styles.staticText}>{String(icon)}</Text>}
      </View>
      <Text style={[styles.staticText, { color: theme.colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const FilterChip = ({ label, count, isActive, onPress }: any) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isActive
          ? [styles.activeChip, { backgroundColor: theme.colors.card }]
          : [styles.inactiveChip, { borderColor: theme.colors.border }],
      ]}
      onPress={onPress}
    >
      <Text style={[isActive ? styles.activeChipText : styles.inactiveChipText, { color: isActive ? theme.colors.text : '#8e8e93' }]}>
        {label}
      </Text>
      <Text style={[styles.activeChipCount, { color: isActive ? theme.colors.text : '#8e8e93' }]}>({count})</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarContainer: {
    position: 'relative',
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
    backgroundColor: '#4CAF50',
    borderWidth: 2,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
  textWrapper: {
    flex: 1,
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
  tabWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  tabItem: {
    paddingVertical: 15,
    marginRight: 30,
    position: 'relative',
  },
  staticMenu: {},
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
    borderRadius: 25,
  },
  activeChip: {},
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
  activeChipCount: {
    fontSize: 15,
    marginLeft: 6,
  },
});

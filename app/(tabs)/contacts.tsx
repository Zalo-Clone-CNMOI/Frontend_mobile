import { ContactsSearchHeader } from '@/src/components/contacts/ContactsSearchHeader';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { AvatarWithPresence } from '@/src/components/common/AvatarWithPresence';
import { ContactListItem, useContactsScreenLogic } from '@/src/hooks/screens/useContactsScreen';
import { useTheme } from '@/src/theme/themeContext';
import type { ConversationV2 } from '@/src/types/chat';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Cake, ChevronRight, UserPlus, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ContactItem({ item, onPress }: {
  item: ContactListItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isOnline = item.status === 'online' || item.isOnline;
  const title = item.fullName || t('contacts.unknown');
  const subtitle = isOnline ? t('contacts.online') : t('contacts.offline');
  const lastSeenText = item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : null;
  const friendsSinceText = item.friendsSince ? new Date(item.friendsSince).toLocaleDateString() : null;

  return (
    <TouchableOpacity
      style={[styles.cardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.cardAvatarContainer}>
        <AvatarWithPresence
          uri={item.avatar}
          name={title}
          size={50}
          status={isOnline ? 'online' : 'offline'}
          lastSeenAt={item.lastSeenAt ? new Date(item.lastSeenAt).getTime() : undefined}
          showPresence={true}
        />
      </View>

      <View style={[styles.cardContent, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
  <View style={styles.textWrapper}>
    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
      {title}
    </Text>
    <Text style={[styles.subtitle, { color: theme.colors.text, opacity: 0.6 }]} numberOfLines={1}>
      {subtitle}
    </Text>
    {item.phone || item.friendsSince ? (
      <Text style={[styles.metaText, { color: theme.colors.text, opacity: 0.5 }]} numberOfLines={1}>
        {item.phone ? item.phone : `${t('contacts.friends_since')} ${friendsSinceText}`}
      </Text>
    ) : null}
    {!isOnline && lastSeenText && (
      <Text style={[styles.lastSeenText, { color: theme.colors.text, opacity: 0.5 }]}>
        {t('contacts.last_seen')} {lastSeenText}
      </Text>
    )}
  </View>

  <View style={styles.trailingWrap}>
    <View style={styles.statusContainer}>
      <Text style={[styles.statusText, { color: isOnline ? '#006AF5' : '#8E8E93' }]}>
        {isOnline ? t('contacts.online') : ''} 
      </Text>
      {isOnline && <View style={styles.onlineDot} />}
    </View>
  </View>
</View>
    </TouchableOpacity>
  );
}

function GroupItem({ item, onPress }: { item: ConversationV2; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const lastMsg = item.lastMessage;
  const timeStr = lastMsg?.timestamp
    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity
      style={[styles.cardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.cardAvatarContainer}>
        <AvatarWithInitials
          name={item.name || t('contacts.unknown')}
          size={50}
          avatarUrl={item.avatar}
        />
      </View>

      <View style={[styles.cardContent, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
        <View style={styles.textWrapper}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name || t('contacts.unknown')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text, opacity: 0.6 }]} numberOfLines={1}>
            {item.memberCount ? `${item.memberCount} members` : ''}
          </Text>
          {lastMsg ? (
            <Text style={[styles.metaText, { color: theme.colors.text, opacity: 0.5 }]} numberOfLines={1}>
              {lastMsg.content}
            </Text>
          ) : null}
        </View>

        <View style={styles.trailingWrap}>
          {timeStr ? (
            <Text style={[styles.lastSeenText, { color: theme.colors.text, opacity: 0.5 }]}>
              {timeStr}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MenuOption({
  icon,
  title,
  count,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={[styles.staticItem, { backgroundColor: theme.colors.background }]} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>{icon}</View>
      <View style={styles.menuBody}>
        <Text style={[styles.staticText, { color: theme.colors.text }]}>{title}</Text>
        {typeof count === 'number' && count > 0 ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={18} color="#8E8E93" />
    </TouchableOpacity>
  );
}

function FilterChip({ label, count, isActive, onPress }: { label: string; count: number; isActive: boolean; onPress: () => void }) {
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
      <Text style={[isActive ? styles.activeChipText : styles.inactiveChipText, { color: isActive ? theme.colors.text : '#8e8e93' }]}>{label}</Text>
      <Text style={[styles.activeChipCount, { color: isActive ? theme.colors.text : '#8e8e93' }]}>({count})</Text>
    </TouchableOpacity>
  );
}

export default function ContactsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    activeTab,
    error,
    filteredFriends,
    friends,
    groups,
    groupsLoading,
    handleRetry,
    handleGroupPress,
    handleViewProfile,
    loading,
    onRefresh,
    receivedRequests,
    refreshing,
    setActiveTab,
    setUsersFilterType,
    usersFilterType,
  } = useContactsScreenLogic();

  const tabs = [t('contacts.friends'), t('contacts.create_group'), t('contacts.oa')];

  const renderListHeader = () => {
    if (activeTab === 0) {
      return (
        <View style={styles.staticMenu}>
          <MenuOption
            icon={<Users size={22} color="#fff" />}
            title={t('contacts.friend_requests')}
            count={receivedRequests.length}
            onPress={() => router.push('/friends/requests' as any)}
          />
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
              count={friends.filter((u) => u.isOnline || u.status === 'online').length}
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
          <MenuOption icon={<UserPlus size={22} color="#fff" />} title={t('contacts.create_group')} onPress={() => router.push('/createGroup')} />
          <View style={[styles.dividerSection, { backgroundColor: theme.colors.dividerSection }]} />
          <View style={styles.chip}>
            <Text style={{ color: theme.colors.text }}>{t('contacts.joined_groups')} ({groups.length})</Text>
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
          data={activeTab === 0 ? filteredFriends : activeTab === 1 ? groups : []}
          keyExtractor={(item: any) => item.id || item.conversationId}
          ListHeaderComponent={renderListHeader}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListFooterComponent={() => (
            <View style={{ padding: 12, alignItems: 'center' }}>
              {(loading || groupsLoading) ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
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
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('contacts.retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (loading || groupsLoading) ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <Text style={{ color: theme.colors.text }}>{t('contacts.empty')}</Text>
              )}
            </View>
          )}
          renderItem={({ item }: { item: any }) => {
            if (activeTab === 1) {
              return (
                <GroupItem
                  item={item as ConversationV2}
                  onPress={() => handleGroupPress(item as ConversationV2)}
                />
              );
            }
            return (
              <ContactItem
                item={item}
                onPress={() => handleViewProfile(item.id)}
              />
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastSeenText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  trailingWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginRight: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CD964',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  cardAvatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.1)' },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  staticMenu: { paddingTop: 8 },
  staticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staticText: { fontSize: 16, fontWeight: '500' },
  menuBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff453a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dividerSection: { height: 10, marginVertical: 6 },
  filterChipContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  activeChip: {},
  inactiveChip: { borderWidth: 1 },
  activeChipText: { fontWeight: '600' },
  inactiveChipText: { fontWeight: '500' },
  activeChipCount: { marginLeft: 4, fontWeight: '600' },
  tabWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: { fontSize: 15 },
  activeTabText: { fontWeight: '700' },
  activeLine: {
    marginTop: 8,
    height: 2,
    width: 42,
    borderRadius: 999,
  },
});

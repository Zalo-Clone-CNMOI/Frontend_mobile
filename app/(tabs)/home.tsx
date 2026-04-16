import { ChatListItem } from '@/src/components/chat/ChatListItem';
import { ChatSearchHeader } from '@/src/components/chat/ChatSearchHeader';
import { useChatSocket } from '@/src/hooks/useChatSocket';
import { useHomeScreenLogic } from '@/src/hooks/screens/useHomeScreen';
import { useTheme } from '@/src/theme/themeContext';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Filter } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { listData, onRefresh, openChat, refreshing } = useHomeScreenLogic();
  useChatSocket(); // Initialize socket for real-time updates

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ChatSearchHeader onPressSearch={() => router.push('/search')} />

        <View style={[styles.filterContainer, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.activeTabContainer}>
            <Text style={[styles.activeTabText, { color: theme.colors.text }]}>{t('messages.title')}</Text>
            <View style={[styles.activeLine, { backgroundColor: theme.colors.text }]} />
          </View>
          <Filter size={18} color="#8e8e93" style={{ marginLeft: 'auto' }} />
        </View>

        <FlashList
          data={listData}
          keyExtractor={(item: any) => item.conversationId || item.id || item._id || ''}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text }}>{t('messages.empty')}</Text>
            </View>
          )}
          renderItem={({ item }) => <ChatListItem item={item} onPress={() => openChat(item)} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  activeTabContainer: { alignItems: 'flex-start' },
  activeTabText: { fontWeight: 'bold', fontSize: 15 },
  activeLine: { height: 2, marginTop: 4 },
});

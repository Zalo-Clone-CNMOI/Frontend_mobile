import { USERS_V2 } from '@/src/data/contactsMockData';
import { useTimelineStore } from '@/src/store/useTimelineStore';
import { FlashList } from '@shopify/flash-list';
import { Camera, PenSquare } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/themeContext';
import { useTranslation } from 'react-i18next';

export default function TimelineScreen() {
  const posts = useTimelineStore((state) => state.posts);
  const postsV2 = useTimelineStore((state) => state.postsV2);
  const initializePosts = useTimelineStore((state) => state.initializePosts);
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    initializePosts();
  }, [initializePosts]);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('timeline.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.background }]}>
            <Camera size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.background }]}>
            <PenSquare size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={(postsV2 && postsV2.length) ? postsV2 : posts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => {
          // If item is v2 post
          if (item.userId) {
            const user = USERS_V2.find((u) => u.id === item.userId);
            const name = user ? user.fullName : t('timeline.default_user');
            const avatar = user ? user.avatar : '';
            const photo = item.images && item.images.length ? item.images[0] : '';
            const time = formatTimeAgo(item.createdAt);

            return (
              <View style={[styles.post, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.postHeader}>
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.colors.text }]}>{name}</Text>
                    <Text style={[styles.time, { color: '#8e8e93' }]}>{time}</Text>
                  </View>
                </View>

                <Text style={[styles.content, { color: theme.colors.text }]}>{item.content}</Text>

                {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
              </View>
            );
          }

          // legacy post
          return (
            <View style={[styles.post, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.postHeader}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.time, { color: '#8e8e93' }]}>{item.time}</Text>
                </View>
              </View>

              <Text style={[styles.content, { color: theme.colors.text }]}>{item.content}</Text>

              <Image source={{ uri: item.photo }} style={styles.photo} />
            </View>
          );
        }}
      />
    </View>
    </SafeAreaView>
  );
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  post: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
  name: { fontSize: 15.5, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 1 },
  content: { fontSize: 14.5, marginBottom: 10 },
  photo: { width: '100%', height: 220, borderRadius: 14 },
});

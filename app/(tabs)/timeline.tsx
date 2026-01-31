import { PostCard } from '@/src/components/timeline/PostCard';
import { TimelineSearchHeader } from '@/src/components/timeline/timelineSearchHeader';
import { USERS_V2 } from '@/src/data/contactsMockData';
import { useTimelineStore } from '@/src/store/useTimelineStore';
import { useTheme } from '@/src/theme/themeContext';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimelineScreen() {
  const theme = useTheme();
  const router = useRouter();

  const posts = useTimelineStore((s) => s.posts);
  const postsV2 = useTimelineStore((s) => s.postsV2);
  const initializePosts = useTimelineStore((s) => s.initializePosts);
  const toggleLike = useTimelineStore((s) => s.toggleLike);
  const incrementComments = useTimelineStore((s) => s.incrementComments);
  const incrementShares = useTimelineStore((s) => s.incrementShares);

  useEffect(() => {
    initializePosts();
  }, [initializePosts]);

  const data = postsV2?.length ? postsV2 : posts;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <TimelineSearchHeader onPressSearch={() => router.push('/search')} />

        <FlashList
          data={data}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => {
            const user = USERS_V2.find((u: any) => u.id === item.userId);
            const author = {
              id: item.userId,
              name: user ? user.fullName : 'Unknown User',
              avatarUrl: user?.avatar
            };
            
            return (
              <PostCard
                author={author}
                content={item.content}
                createdAt={item.createdAt}
                liked={item.liked}
                likes={item.likes}
                comments={item.comments}
                shares={item.shares}
                images={item.images}
                onPressLike={() => toggleLike(item.id)}
                onPressComment={() => incrementComments(item.id)}
                onPressShare={() => incrementShares(item.id)}
                onPressMore={() => console.log('More pressed for post:', item.id)}
                onPressMedia={(uri) => console.log('Media pressed:', uri)}
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
});

import { useTimelineStore } from '@/src/store/useTimelineStore';
import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimelineScreen() {
  const theme = useTheme();
  const initializePosts = useTimelineStore((s) => s.initializePosts);

  useEffect(() => {
    initializePosts();
  }, [initializePosts]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      {/* <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      </View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});

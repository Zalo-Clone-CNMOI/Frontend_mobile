import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Camera, PenSquare } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimelineStore } from '@/src/store/useTimelineStore';

export default function TimelineScreen() {
  const posts = useTimelineStore((state) => state.posts);
  const initializePosts = useTimelineStore((state) => state.initializePosts);

  useEffect(() => {
    initializePosts();
  }, [initializePosts]);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhật ký</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Camera size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <PenSquare size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </View>

            <Text style={styles.content}>{item.content}</Text>

            <Image source={{ uri: item.photo }} style={styles.photo} />
          </View>
        )}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  post: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#121212',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: '#222' },
  name: { color: '#fff', fontSize: 15.5, fontWeight: '600' },
  time: { color: '#8e8e93', fontSize: 12, marginTop: 1 },
  content: { color: '#d0d0d0', fontSize: 14.5, marginBottom: 10 },
  photo: { width: '100%', height: 220, borderRadius: 14, backgroundColor: '#222' },
});

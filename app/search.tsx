import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSearchStore } from '../src/store/searchStore';

export default function SearchScreen() {
  const router = useRouter();
  const query = useSearchStore((state) => state.query);
  const filteredResults = useSearchStore((state) => state.filteredResults);
  const filteredResultsV2 = useSearchStore((state) => state.filteredResultsV2);
  const setQuery = useSearchStore((state) => state.setQuery);
  const initializeSearchData = useSearchStore((state) => state.initializeSearchData);

  // Initialize search data on mount
  useEffect(() => {
    initializeSearchData();
  }, [initializeSearchData]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tìm kiếm',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.searchWrap}>
        <Search size={18} color="#8e8e93" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm"
          placeholderTextColor="#8e8e93"
          style={styles.searchInput}
          autoFocus
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <X size={18} color="#8e8e93" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Gợi ý</Text>

      {/* Render v2 results first (users + conversations), fall back to legacy results */}
      <FlashList
        data={filteredResultsV2 && filteredResultsV2.length ? filteredResultsV2 : filteredResults}
        keyExtractor={(item: any) => (item.type === 'user' ? item.id : item.type === 'conversation' ? item.conversationId : item.id)}
        renderItem={({ item }: any) => {
          // v2 item
          if (item.type === 'user') {
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.fullName } })}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.rowContent}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Người dùng
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }

          if (item.type === 'conversation') {
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.conversationId, name: item.name } })}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.rowContent}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Cuộc trò chuyện
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }

          // legacy item
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.name } })}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.rowContent}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, marginLeft: 8 },
  clearBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#8e8e93', fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222' },
  rowContent: { flex: 1, marginLeft: 12, borderBottomWidth: 0.5, borderBottomColor: '#222', paddingBottom: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '500' },
  subtitle: { color: '#8e8e93', fontSize: 13, marginTop: 2 },
});

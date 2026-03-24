import { useSearchScreenLogic } from '@/src/hooks/screens/useSearchScreen';
import { useTheme } from '@/src/theme/themeContext';
import { mapFriendshipStatus } from '@/src/utils/friendshipStatus';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { error, filteredResults, filteredResultsV2, hasNext, loadMore, loading, query, setQuery } = useSearchScreenLogic();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tim kiem',
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
        }}
      />

      <View style={[styles.searchWrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Search size={18} color="#8e8e93" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('common.search')}
          placeholderTextColor="#8e8e93"
          style={[styles.searchInput, { color: theme.colors.text }]}
          autoFocus
          maxLength={50}
          onSubmitEditing={() => {
            if (query.trim().length >= 2) {
              setQuery(query.trim());
            }
          }}
        />
        {loading ? (
          <View style={styles.clearBtn}>
            <ActivityIndicator size="small" color="#8e8e93" />
          </View>
        ) : query ? (
          <View style={styles.searchActions}>
            <Text style={[styles.charCount, { color: query.length > 40 ? '#ff6b6b' : '#8e8e93' }]}>{query.length}/50</Text>
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={18} color="#8e8e93" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {error ? <Text style={[styles.errorText]}>{error}</Text> : null}

      <Text style={[styles.sectionTitle, { color: '#8e8e93' }]}>{t('common.suggestions')}</Text>

      <FlashList
        data={filteredResultsV2 && filteredResultsV2.length ? filteredResultsV2 : filteredResults}
        keyExtractor={(item: any) =>
          item.type === 'user' ? item.id : item.type === 'conversation' ? item.conversationId : item.id
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={() =>
          loading && hasNext ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }: any) => {
          if (item.type === 'user') {
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: theme.colors.background }]}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.fullName } })}
              >
                <Image source={{ uri: item.avatarUrl || item.avatar }} style={styles.avatar} />
                <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.fullName}</Text>
                  <Text style={[styles.subtitle, { color: '#8e8e93' }]} numberOfLines={1}>
                    {item.phone ?? ''} {item.friendshipStatus ? `· ${item.friendshipStatus}` : ''}
                  </Text>
                </View>
                {item.friendshipStatus
                  ? (() => {
                      const st = mapFriendshipStatus(item.friendshipStatus);
                      return (
                        <View style={[styles.statusBadge, { backgroundColor: st.color, borderColor: st.color }]}>
                          <Text style={[styles.statusText, { color: st.textColor }]}>{st.label}</Text>
                        </View>
                      );
                    })()
                  : null}
              </TouchableOpacity>
            );
          }

          if (item.type === 'conversation') {
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: theme.colors.background }]}
                onPress={() =>
                  router.push({ pathname: '/chat/[id]', params: { id: item.conversationId, name: item.name } })
                }
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.subtitle, { color: '#8e8e93' }]} numberOfLines={1}>
                    {t('common.conversation')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.colors.background }]}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.name } })}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.subtitle, { color: '#8e8e93' }]} numberOfLines={1}>
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
  container: { flex: 1 },
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
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charCount: {
    fontSize: 12,
    minWidth: 30,
    textAlign: 'right',
  },
  clearBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  errorText: { color: '#ff6b6b', marginHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  rowContent: { flex: 1, marginLeft: 12, borderBottomWidth: 0.5, paddingBottom: 12 },
  name: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  statusText: { fontSize: 12 },
});

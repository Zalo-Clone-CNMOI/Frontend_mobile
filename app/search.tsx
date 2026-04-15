import { useAuth } from '@/src/contexts/AuthContext';
import { useSearchScreenLogic } from '@/src/hooks/screens/useSearchScreen';
import { createDirect } from '@/src/services/conversationsApi';
import { sendRuntimeFriendRequest } from '@/src/services/realtime/runtimeFriendActions';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useTheme } from '@/src/theme/themeContext';
import { mapFriendshipStatus } from '@/src/utils/friendshipStatus';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { error, filteredResults, filteredResultsV2, hasNext, loadMore, loading, query, setQuery } = useSearchScreenLogic();
  const friends = useRealtimeStore((state) => state.friends);
  const receivedRequests = useRealtimeStore((state) => state.receivedRequests);
  const sentRequests = useRealtimeStore((state) => state.sentRequests);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const friendIds = useMemo(() => new Set(friends.map((item) => item.id)), [friends]);
  const sentTargetIds = useMemo(() => new Set(sentRequests.map((item) => item.targetUserId)), [sentRequests]);
  const receivedRequesterIds = useMemo(() => new Set(receivedRequests.map((item) => item.requesterId)), [receivedRequests]);

  const openChatWithUser = async (userId: string, fullName: string) => {
    const response = await createDirect(userId);
    const conversation = response?.data;
    const conversationId =
      conversation?.data?.id ||
      conversation?.data?._id ||
      conversation?.data?.conversationId ||
      conversation?.id ||
      conversation?._id ||
      conversation?.conversationId;

    if (conversationId) {
      router.push({ pathname: '/chat/[id]', params: { id: String(conversationId), name: fullName } });
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    setProcessingUserId(targetUserId);
    try {
      await sendRuntimeFriendRequest(targetUserId);
    } finally {
      setProcessingUserId(null);
    }
  };

  const renderUserAction = (item: any) => {
    const isSelf = item.id === user?.id;
    const isFriend = friendIds.has(item.id);
    const isSent = sentTargetIds.has(item.id);
    const isReceived = receivedRequesterIds.has(item.id);
    const isProcessing = processingUserId === item.id;

    if (isSelf) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#8E8E93', borderColor: '#8E8E93' }]}>
          <Text style={[styles.statusText, { color: '#fff' }]}>You</Text>
        </View>
      );
    }

    if (isProcessing) {
      return <ActivityIndicator size="small" color={theme.colors.primary} />;
    }

    if (isFriend) {
      return (
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
          onPress={() => openChatWithUser(item.id, item.fullName)}
        >
          <Text style={[styles.statusText, { color: '#fff' }]}>Chat</Text>
        </TouchableOpacity>
      );
    }

    if (isReceived) {
      return (
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: '#FF9F0A', borderColor: '#FF9F0A' }]}
          onPress={() => router.push('/friends/requests' as any)}
        >
          <Text style={[styles.statusText, { color: '#000' }]}>Respond</Text>
        </TouchableOpacity>
      );
    }

    if (isSent) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#FF9F0A', borderColor: '#FF9F0A' }]}>
          <Text style={[styles.statusText, { color: '#000' }]}>Requested</Text>
        </View>
      );
    }

    const st = mapFriendshipStatus(item.friendshipStatus);
    return (
      <TouchableOpacity
        style={[styles.statusBadge, { backgroundColor: st.color, borderColor: st.color }]}
        onPress={() => handleAddFriend(item.id)}
      >
        <Text style={[styles.statusText, { color: st.textColor }]}>{st.label || 'Add'}</Text>
      </TouchableOpacity>
    );
  };

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
              <View style={[styles.row, { backgroundColor: theme.colors.background }]}> 
                <Image source={{ uri: item.avatarUrl || item.avatar || `https://i.pravatar.cc/150?u=${item.id}` }} style={styles.avatar} />
                <View style={[styles.rowContent, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.fullName}</Text>
                  <Text style={[styles.subtitle, { color: '#8e8e93' }]} numberOfLines={1}>
                    {item.phone ?? ''}
                  </Text>
                </View>
                {renderUserAction(item)}
              </View>
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
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  charCount: { fontSize: 12, minWidth: 30, textAlign: 'right' },
  clearBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  errorText: { color: '#ff6b6b', marginHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  rowContent: { flex: 1, marginLeft: 12, borderBottomWidth: 0.5, paddingBottom: 12 },
  name: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
});


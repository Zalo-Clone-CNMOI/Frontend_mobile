import { useAuth } from '@/src/contexts/AuthContext';
import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useDirectChat } from '@/src/hooks/useDirectChat';
import { useSearchScreenLogic } from '@/src/hooks/screens/useSearchScreen';
import {
  cancelRuntimeFriendRequest,
  respondRuntimeFriendRequest,
  sendRuntimeFriendRequest,
} from '@/src/services/realtime/runtimeFriendActions';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useTheme } from '@/src/theme/themeContext';
import { mapFriendshipStatus } from '@/src/utils/friendshipStatus';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { Check, MessageCircle, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [localOutgoingIds, setLocalOutgoingIds] = useState<Set<string>>(new Set());
  const { startChat, isStarting: isStartingChat } = useDirectChat();

  const friendIds = useMemo(() => new Set(friends.map((item) => item.id)), [friends]);
  const sentTargetIds = useMemo(() => new Set(sentRequests.map((item) => item.targetUserId)), [sentRequests]);
  const receivedRequesterIds = useMemo(() => new Set(receivedRequests.map((item) => item.requesterId)), [receivedRequests]);

  useEffect(() => {
    return () => {
      setQuery('');
    };
  }, [setQuery]);

  const openChatWithUser = async (userId: string, fullName: string) => {
    const result = await startChat(userId, fullName);
    if (!result.success) {
      Alert.alert('Lỗi', result.error || 'Không thể bắt đầu cuộc trò chuyện');
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    setProcessingUserId(targetUserId);
    try {
      await sendRuntimeFriendRequest(targetUserId);
      // Update local state immediately for UI feedback
      setLocalOutgoingIds(prev => new Set([...prev, targetUserId]));
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setProcessingUserId(requestId);
    try {
      await cancelRuntimeFriendRequest(requestId);
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingUserId(requestId);
    try {
      await respondRuntimeFriendRequest(requestId, 'accept');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingUserId(requestId);
    try {
      await respondRuntimeFriendRequest(requestId, 'reject');
    } finally {
      setProcessingUserId(null);
    }
  };

  const renderUserAction = (item: any) => {
    const isSelf = item.id === user?.id;
    const isFriend = friendIds.has(item.id);
    const isOutgoing = sentTargetIds.has(item.id) || localOutgoingIds.has(item.id);
    const isIncoming = receivedRequesterIds.has(item.id);
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
          disabled={isStartingChat}
        >
          {isStartingChat ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.statusText, { color: '#fff' }]}>Chat</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (isIncoming) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
            onPress={() => handleAcceptRequest(item.id)}
            disabled={isProcessing}
          >
            <Check size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Chấp nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#f44336' }]}
            onPress={() => handleRejectRequest(item.id)}
            disabled={isProcessing}
          >
            <X size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isOutgoing) {
      return (
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: '#fff3e0', borderColor: '#fb8c00' }]}
          onPress={() => handleCancelRequest(item.id)}
          disabled={isProcessing}
        >
          <Text style={[styles.statusText, { color: '#fb8c00' }]}>Đã gửi</Text>
        </TouchableOpacity>
      );
    }

    const st = mapFriendshipStatus(item.friendshipStatus);
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: st.color }]}
          onPress={() => handleAddFriend(item.id)}
          disabled={isProcessing}
        >
          <Text style={styles.actionBtnText}>{st.label || 'Add'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2196f3' }]}
          onPress={async () => {
            const result = await startChat(item.id, item.fullName);
            if (!result.success) {
              Alert.alert('Lỗi', result.error || 'Không thể bắt đầu cuộc trò chuyện');
            }
          }}
          disabled={isStartingChat}
        >
          {isStartingChat ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MessageCircle size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Nhắn tin</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tìm kiếm',
          headerStyle: { backgroundColor: theme.colors.header },
          headerTintColor: theme.colors.textHeader,
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
                {item.avatarUrl || item.avatar ? (
                  <Image source={{ uri: item.avatarUrl || item.avatar }} style={styles.avatar} />
                ) : (
                  <AvatarWithInitials name={item.fullName || 'User'} size={44} style={styles.avatar} />
                )}
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
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <AvatarWithInitials name={item.name || 'Group'} size={44} style={styles.avatar} />
                )}
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
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <AvatarWithInitials name={item.name || 'Chat'} size={44} style={styles.avatar} />
              )}
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
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.1)' },
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
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { fetchRuntimeFriendSnapshot } from '@/src/services/realtime/runtimeFriendService';
import {
  cancelRuntimeFriendRequest,
  respondRuntimeFriendRequest,
} from '@/src/services/realtime/runtimeFriendActions';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useTheme } from '@/src/theme/themeContext';
import { Stack } from 'expo-router';
import { Check, Clock, Inbox, Send, UserX, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const normalizeAvatarUrl = (avatar?: string): string | undefined => {
  if (!avatar) return undefined;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/' + avatar.replace(/^\//, '');
};

export default function FriendRequestsScreen() {
  const theme = useTheme();
  const receivedRequests = useRealtimeStore((s) => s.receivedRequests);
  const sentRequests = useRealtimeStore((s) => s.sentRequests);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const list = useMemo(
    () => (activeTab === 'received' ? receivedRequests : sentRequests),
    [activeTab, receivedRequests, sentRequests],
  );

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingId(requestId);
    try {
      await respondRuntimeFriendRequest(requestId, action);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await cancelRuntimeFriendRequest(requestId);
    } finally {
      setProcessingId(null);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await fetchRuntimeFriendSnapshot();
      useRealtimeStore.getState().setFriendSnapshot(snapshot);
    } catch (err) {
    } finally {
      setRefreshing(false);
    }
  }, []);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Lời mời kết bạn',
          headerStyle: { backgroundColor: theme.colors.statusBar },
          headerTintColor: theme.colors.textHeader,
        }}
      />

      
      <View style={[styles.tabBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.tab]}
          onPress={() => setActiveTab('received')}
        >
          <Inbox
            size={18}
            color={activeTab === 'received' ? theme.colors.primary : theme.colors.icon}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'received' ? theme.colors.primary : theme.colors.icon,
                fontWeight: activeTab === 'received' ? '700' : '500',
              },
            ]}
          >
            Đã nhận ({receivedRequests.length})
          </Text>
          {activeTab === 'received' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab]}
          onPress={() => setActiveTab('sent')}
        >
          <Send
            size={18}
            color={activeTab === 'sent' ? theme.colors.primary : theme.colors.icon}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'sent' ? theme.colors.primary : theme.colors.icon,
                fontWeight: activeTab === 'sent' ? '700' : '500',
              },
            ]}
          >
            Đã gửi ({sentRequests.length})
          </Text>
          {activeTab === 'sent' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {list.length === 0 ? (
          <View style={styles.emptyWrap}>
            {activeTab === 'received' ? (
              <Inbox size={56} color={theme.colors.border} />
            ) : (
              <Send size={56} color={theme.colors.border} />
            )}
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {activeTab === 'received' ? 'Không có lời mời nào' : 'Chưa gửi lời mời nào'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.icon }]}>
              {activeTab === 'received'
                ? 'Khi có ai đó gửi lời mời kết bạn cho bạn,\nnó sẽ hiển thị ở đây.'
                : 'Tìm bạn bè bằng số điện thoại\nhoặc quét mã QR.'}
            </Text>
          </View>
        ) : (
          list.map((request, index) => {
            const profile = (request as any).user
              || (activeTab === 'received' ? request.requester : request.target);
            const isBusy = processingId === request.id;
            const avatarUrl = normalizeAvatarUrl(profile?.avatarUrl);
            return (
              <View
                key={request.id || `req-${index}`}
                style={[styles.card, { backgroundColor: theme.colors.card }]}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <AvatarWithInitials name={profile?.fullName || 'User'} size={56} style={styles.avatar} />
                )}

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text
                      style={[styles.name, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {profile?.fullName || 'Người dùng'}
                    </Text>
                    <Text style={[styles.time, { color: theme.colors.icon }]}>
                      {formatTime(request.createdAt)}
                    </Text>
                  </View>

                  {profile?.phone && (
                    <Text style={[styles.phone, { color: theme.colors.icon }]}>
                      {profile.phone}
                    </Text>
                  )}

                  {request.message && (
                    <Text
                      style={[styles.message, { color: theme.colors.text }]}
                      numberOfLines={2}
                    >
                      &quot;{request.message}&quot;
                    </Text>
                  )}

                  
                  <View style={styles.actions}>
                    {isBusy ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : activeTab === 'received' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                          onPress={() => handleRespond(request.id, 'accept')}
                        >
                          <Check size={16} color="#fff" />
                          <Text style={styles.acceptText}>Đồng ý</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rejectBtn, { borderColor: theme.colors.border }]}
                          onPress={() => handleRespond(request.id, 'reject')}
                        >
                          <X size={16} color={theme.colors.icon} />
                          <Text style={[styles.rejectText, { color: theme.colors.text }]}>
                            Từ chối
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: '#e53935' }]}
                        onPress={() => handleCancel(request.id)}
                      >
                        <UserX size={16} color="#e53935" />
                        <Text style={[styles.cancelText]}>Thu hồi</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: { fontSize: 14 },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  
  content: { padding: 16, paddingBottom: 40, gap: 10 },

  
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  phone: { fontSize: 13, marginTop: 2 },
  message: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.8,
  },

  
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 22,
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  rejectText: { fontWeight: '600', fontSize: 13 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  cancelText: { color: '#e53935', fontWeight: '600', fontSize: 13 },
});

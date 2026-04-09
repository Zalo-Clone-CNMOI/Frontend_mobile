import { cancelRuntimeFriendRequest, respondRuntimeFriendRequest } from '@/src/services/realtime/runtimeFriendActions';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useTheme } from '@/src/theme/themeContext';
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FriendRequestsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const receivedRequests = useRealtimeStore((state) => state.receivedRequests);
  const sentRequests = useRealtimeStore((state) => state.sentRequests);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const list = useMemo(
    () => (activeTab === 'received' ? receivedRequests : sentRequests),
    [activeTab, receivedRequests, sentRequests],
  );

  const handleRespond = async (requestId: string, action: 'accepted' | 'rejected') => {
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Friend Requests',
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
        }}
      />

      <View style={styles.tabRow}>
        {[
          { key: 'received', label: `Received (${receivedRequests.length})` },
          { key: 'sent', label: `Sent (${sentRequests.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as 'received' | 'sent')}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={{ color: isActive ? '#fff' : theme.colors.text, fontWeight: '600' }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {list.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>No requests</Text>
            <Text style={{ color: theme.colors.icon, marginTop: 4, textAlign: 'center' }}>
              {activeTab === 'received'
                ? 'B?n chua c� l?i m?i k?t b?n n�o dang ch? x? l�.'
                : 'B?n chua g?i l?i m?i k?t b?n n�o.'}
            </Text>
          </View>
        ) : (
          list.map((request) => {
            const profile = activeTab === 'received' ? request.requester : request.target;
            const isBusy = processingId === request.id;
            return (
              <View
                key={request.id}
                style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <Image
                  source={{ uri: profile?.avatarUrl || `https://i.pravatar.cc/160?u=${profile?.id || request.id}` }}
                  style={styles.avatar}
                />
                <View style={styles.body}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.fullName || t('contacts.unknown_user')}</Text>
                  {profile?.phone ? (
                    <Text style={[styles.meta, { color: theme.colors.icon }]}>{profile.phone}</Text>
                  ) : null}
                  <Text style={[styles.meta, { color: theme.colors.icon }]}>
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Pending request'}
                  </Text>
                </View>
                <View style={styles.actions}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : activeTab === 'received' ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      key={`accept-${request.id}`}
                      onPress={() => handleRespond(request.id, 'accepted')}
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                      >
                        <Text style={styles.primaryText}>Accept</Text>
                        </TouchableOpacity>
                    <TouchableOpacity
                      key={`reject-${request.id}`}
                      onPress={() => handleRespond(request.id, 'rejected')}
                        style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                      >
                        <Text style={[styles.secondaryText, { color: theme.colors.text }]}>Reject</Text>
                        </TouchableOpacity>
                  </View>
                  ) : (
                    <TouchableOpacity
                      key={`cancel-${request.id}`}
                      onPress={() => handleCancel(request.id)}
                      style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                      >
                      <Text style={[styles.secondaryText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
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
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    marginTop: 40,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    gap: 8,
    alignItems: 'flex-end',
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryText: {
    fontWeight: '600',
  },
});



import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useGroupInviteStore } from '@/src/store/useGroupInviteStore';
import { useTheme } from '@/src/theme/themeContext';
import { Tabs } from 'expo-router';
import { Clock3, Contact2, LayoutGrid, MessageSquare, User2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';


export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const receivedRequestsCount = useRealtimeStore((state) => state.receivedRequests.length);
  const pendingInvitesCount = useGroupInviteStore((state) => state.unreadCount);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.statusBar },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('navigation.tabs.messages'),
          tabBarBadge: pendingInvitesCount > 0 ? (pendingInvitesCount > 99 ? '99+' : pendingInvitesCount) : undefined,
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} fill={color === '#0091ff' ? color : 'none'} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('navigation.tabs.contacts'),
          tabBarBadge: receivedRequestsCount > 0 ? (receivedRequestsCount > 99 ? '99+' : receivedRequestsCount) : undefined,
          tabBarIcon: ({ color }) => <Contact2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: t('navigation.tabs.discover'),
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: t('navigation.tabs.timeline'),
          tabBarIcon: ({ color }) => <Clock3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.tabs.profile'),
          tabBarIcon: ({ color }) => <User2 size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

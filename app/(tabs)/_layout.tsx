import { useTheme } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { MessageSquare, Contact2, LayoutGrid, Clock3, User2 } from 'lucide-react-native';

export default function TabsLayout() {
  const theme = useTheme()
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: '#8e8e93',
      tabBarStyle: { backgroundColor: theme.colors.background, borderTopWidth: 0.5, borderTopColor: '#333' },
      headerShown: false,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Tin nhắn',
        tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} fill={color === '#0091ff' ? color : 'none'} />,
      }} />
      <Tabs.Screen name="contacts" options={{
        title: 'Danh bạ',
        tabBarIcon: ({ color }) => <Contact2 size={24} color={color} />,
      }} />
      <Tabs.Screen name="discovery" options={{
        title: 'Khám phá',
        tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
      }} />
      <Tabs.Screen name="timeline" options={{
        title: 'Nhật ký',
        tabBarIcon: ({ color }) => <Clock3 size={24} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Cá nhân',
        tabBarIcon: ({ color }) => <User2 size={24} color={color} />,
      }} />
    </Tabs>
  );
}
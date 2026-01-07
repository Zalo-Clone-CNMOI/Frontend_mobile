import { Tabs } from 'expo-router';
import { MessageSquare, Contact2, LayoutGrid, Clock3, User2 } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0091ff',
      tabBarInactiveTintColor: '#8e8e93',
      tabBarStyle: { backgroundColor: '#1a1a1a', borderTopWidth: 0.5, borderTopColor: '#333' },
      headerShown: false,
      headerStyle: { backgroundColor: '#1a1a1a' },
      headerTintColor: '#fff',
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
import { ProfileSearchHeader } from '@/src/components/profile/profileSearchHeader';
import { useProfileStore } from '@/src/store/useProfileStore';
import { router } from 'expo-router';
import { Bell, ChevronRight, Settings, Shield, Star } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/themeContext';

function Row({ title, Icon }: { title: string; Icon: React.ComponentType<{ size?: number; color?: string }> }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowIconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
          <Icon size={18} color={theme.colors.primary} />
        </View>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      <ChevronRight size={18} color="#8e8e93" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const profile = useProfileStore((state) => state.profile);
  const initializeProfile = useProfileStore((state) => state.initializeProfile);
  const theme = useTheme();

  useEffect(() => {
    initializeProfile();
  }, [initializeProfile]);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ProfileSearchHeader onPressSearch={() => router.push('/search')} />
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Image source={{ uri: profile?.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.name}</Text>
          <Text style={[styles.subtitle, { color: '#8e8e93' }]}>{profile?.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Row title="Ví ZaloPay" Icon={Star} />
        <Row title="Thông báo" Icon={Bell} />
        <Row title="Quyền riêng tư" Icon={Shield} />
        <Row title="Cài đặt" Icon={Settings} />
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    margin: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 54, height: 54, borderRadius: 27, marginRight: 12 },
  name: { fontSize: 16.5, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 4 },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15 },
});

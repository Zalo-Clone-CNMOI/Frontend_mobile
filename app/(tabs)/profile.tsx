import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { ChevronRight, QrCode, Shield, Settings, Bell, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '@/src/store/useProfileStore';

function Row({ title, Icon }: { title: string; Icon: React.ComponentType<{ size?: number; color?: string }> }) {
  return (
    <TouchableOpacity style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          <Icon size={18} color="#0091ff" />
        </View>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <ChevronRight size={18} color="#8e8e93" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const profile = useProfileStore((state) => state.profile);
  const initializeProfile = useProfileStore((state) => state.initializeProfile);

  useEffect(() => {
    initializeProfile();
  }, [initializeProfile]);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cá nhân</Text>
        <TouchableOpacity style={styles.iconButton}>
          <QrCode size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Image source={{ uri: profile?.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.subtitle}>{profile?.subtitle}</Text>
        </View>
      </View>

      <View style={styles.section}>
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
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  card: {
    margin: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#222', marginRight: 12 },
  name: { color: '#fff', fontSize: 16.5, fontWeight: '600' },
  subtitle: { color: '#8e8e93', fontSize: 13, marginTop: 4 },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#121212',
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#0e2236',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: '#fff', fontSize: 15 },
});

import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useTheme } from '@/src/theme/themeContext';
import { getUserProfile } from '@/src/services/usersApi';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Circle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';

const S3_BASE_URL = 'https://onn-bucket-23.s3.ap-southeast-1.amazonaws.com/';

const normalizeAvatarUrl = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return S3_BASE_URL + avatar.replace(/^\//, '');
};

export default function UserProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      router.back();
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await getUserProfile(userId);
        setUserData(response);
      } catch (error) {
        // Error fetching user data
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Hồ sơ',
            headerStyle: {
              backgroundColor: theme.colors.statusBar,
            },
            headerTintColor: theme.colors.textHeader,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={theme.colors.iconHeader} />
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Đang tải...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Hồ sơ',
            headerStyle: {
              backgroundColor: theme.colors.statusBar,
            },
            headerTintColor: theme.colors.textHeader,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={theme.colors.iconHeader} />
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Không tìm thấy người dùng</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <TouchableOpacity 
        style={[styles.backButton, { top: 50, left: 20 }]}
        onPress={() => router.back()}
      >
        <View style={[styles.backButtonIcon, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </View>
      </TouchableOpacity>
      <View style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarShadow}>
              {userData.avatarUrl && normalizeAvatarUrl(userData.avatarUrl) ? (
                <Image source={{ uri: normalizeAvatarUrl(userData.avatarUrl)! }} style={styles.avatar} />
              ) : (
                <AvatarWithInitials name={userData.fullName || 'User'} size={100} style={styles.avatar} />
              )}
            </View>
          </View>
          <Text style={styles.name}>
            {userData.fullName || 'User'}
          </Text>
          {userData.status && (
            <View style={styles.statusBadge}>
              <Circle size={8} color="#4ade80" fill="#4ade80" />
              <Text style={styles.statusText}>
                {userData.status.charAt(0).toUpperCase() + userData.status.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {userData.bio && (
        <View style={[styles.bioCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.bioTitle, { color: theme.colors.text }]}>About</Text>
          <Text style={[styles.bioText, { color: theme.colors.text }]}>
            {userData.bio}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerGradient: {
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#667eea',
  },
  header: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatarShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  bioCard: {
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

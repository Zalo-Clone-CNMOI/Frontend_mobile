import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/theme/themeContext';
import { Calendar, LogOut, Mail, Phone, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  console.log(user);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout_title'),
      t('profile.logout_message'),
      [
        { text: t('profile.logout_cancel'), style: 'cancel' },
        {
          text: t('profile.logout_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t('profile.not_updated');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return t('profile.not_updated');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <User size={40} color="#fff" />
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: theme.colors.text }]}>
          {user?.name || 'User ' + user?.phone}
        </Text>
        <Text style={[styles.phone, { color: theme.colors.icon }]}>
          {user?.phone}
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.infoItem}>
          <Phone size={20} color={theme.colors.icon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme.colors.icon }]}>{t('profile.phone_number')}</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.phone}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Mail size={20} color={theme.colors.icon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme.colors.icon }]}>{t('profile.email')}</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {user?.email || t('profile.not_updated')}
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Calendar size={20} color={theme.colors.icon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme.colors.icon }]}>{t('profile.date_of_birth')}</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {formatDate(user?.dateOfBirth || '')}
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <User size={20} color={theme.colors.icon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme.colors.icon }]}>{t('profile.gender')}</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {user?.gender === 'male' ? t('profile.male') : user?.gender === 'female' ? t('profile.female') : t('profile.not_updated')}
            </Text>
          </View>
        </View>
      </View>

      {user?.bio && (
        <View style={[styles.bioCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.bioTitle, { color: theme.colors.text }]}>{t('profile.bio')}</Text>
          <Text style={[styles.bioText, { color: theme.colors.icon }]}>
            {user.bio}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: '#ff3b30' }]}
        onPress={handleLogout}
      >
        <LogOut size={20} color="#fff" />
        <Text style={styles.logoutText}>{t('profile.logout_confirm')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  'infoItem:last-child': {
    marginBottom: 0,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  bioCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

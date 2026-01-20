import { useTheme } from '@/src/theme/themeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Thông báo
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.icon }]}>
        Quản lý thông báo và thông tin
      </Text>
      
      <View style={styles.notificationsContainer}>
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.notificationIconText}>🔔</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
              Tin nhắn mới
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.icon }]}>
              2 phút trước
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.colors.text }]}>
              Bạn có một tin nhắn mới từ Nguyễn Văn A
            </Text>
          </View>
        </View>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.notificationIconText}>💬</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
              Bình luận mới
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.icon }]}>
              5 phút trước
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.colors.text }]}>
              Trần Thị B đã bình luận về bài viết của bạn
            </Text>
          </View>
        </View>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.notificationIconText}>❤️</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
              Lượt thích mới
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.icon }]}>
              1 giờ trước
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.colors.text }]}>
              Lê Minh đã thích bài viết của bạn
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  notificationsContainer: {
    gap: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

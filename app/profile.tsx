import { useTheme } from '@/src/theme/themeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Trang cá nhân
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.icon }]}>
        Quản lý thông tin cá nhân
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

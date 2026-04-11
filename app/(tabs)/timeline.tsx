import { useTimelineStore } from '@/src/store/useTimelineStore';
import { useTheme } from '@/src/theme/themeContext';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimelineScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const initializePosts = useTimelineStore((s) => s.initializePosts);

  useEffect(() => {
    initializePosts();
  }, [initializePosts]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});

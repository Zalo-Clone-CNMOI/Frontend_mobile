import CardFeatures from '@/src/components/discovery/cardFeatures';
import { DiscoverySearchHeader } from '@/src/components/discovery/discoverySearchHeader';
import { useDiscoveryStore } from '@/src/store/useDiscoveryStore';
import { useTheme } from '@/src/theme/themeContext';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DiscoveryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const features = useDiscoveryStore((state) => state.features);
  const initializeFeatures = useDiscoveryStore(
    (state) => state.initializeFeatures
  );

  useEffect(() => {
    initializeFeatures();
  }, [initializeFeatures]);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: theme.colors.statusBar },
      ]}
      edges={['top']}
    >
      <StatusBar style="light" />
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <DiscoverySearchHeader onPressSearch={() => {router.push('/search')}} />

        <FlashList
          data={features}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <CardFeatures FEATURES={item} />
          )}
          estimatedItemSize={100}
        />
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  grid: {
    padding: 12,
  },
});

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CardFeatures from '@/src/components/discovery/cardFeatures';
import { DiscoverySearchHeader } from '@/src/components/discovery/discoverySearchHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDiscoveryStore } from '@/src/store/useDiscoveryStore';
import { useTheme } from '@/src/theme/themeContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

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
        { backgroundColor: theme.colors.background },
      ]}
      edges={['top']}
    >
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

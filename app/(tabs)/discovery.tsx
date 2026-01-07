import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CardFeatures from '@/src/components/discovery/cardFeatures';
import { DiscoverySearchHeader } from '@/src/components/discovery/discoverySearchHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDiscoveryStore } from '@/src/store/useDiscoveryStore';

export default function DiscoveryScreen() {
  const features = useDiscoveryStore((state) => state.features);
  const initializeFeatures = useDiscoveryStore((state) => state.initializeFeatures);

  useEffect(() => {
    initializeFeatures();
  }, [initializeFeatures]);



  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.container}>

      <DiscoverySearchHeader onPressSearch={() => { }} />

      <FlashList
        data={features}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <CardFeatures FEATURES={item} />}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  
  safeArea: { flex: 1 ,
    backgroundColor: '#000',
  },
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  grid: { padding: 12 },
  card: {
    flex: 1,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 14,
    margin: 8,
    minHeight: 96,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0e2236',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
});

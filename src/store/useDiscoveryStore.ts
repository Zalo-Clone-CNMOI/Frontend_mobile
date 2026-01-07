import { create } from 'zustand';
import { DiscoveryFeature } from '../types/discovery';
import { DISCOVERY_FEATURES_MOCK_DATA } from '../data/discoveryMockData';

interface DiscoveryState {
  // State
  features: DiscoveryFeature[];

  // Actions
  initializeFeatures: () => void;
  getFeatures: () => DiscoveryFeature[];
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  // State
  features: [],

  // Actions
  initializeFeatures: () => {
    set({
      features: DISCOVERY_FEATURES_MOCK_DATA,
    });
  },

  getFeatures: () => {
    return get().features;
  },
}));

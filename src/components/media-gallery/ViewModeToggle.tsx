import React from 'react';
import { Grid3X3, LayoutList } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  theme: any;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  theme,
}) => {
  return (
    <View style={styles.viewModeContainer}>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeActive]}
        onPress={() => onViewModeChange('grid')}
      >
        <Grid3X3 size={20} color={viewMode === 'grid' ? theme.colors.primary : theme.colors.icon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
        onPress={() => onViewModeChange('list')}
      >
        <LayoutList size={20} color={viewMode === 'list' ? theme.colors.primary : theme.colors.icon} />
      </TouchableOpacity>
    </View>
  );
};

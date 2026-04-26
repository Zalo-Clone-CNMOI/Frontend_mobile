import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import { type AppTheme } from '@/src/theme/themeManager';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: AppTheme;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
      <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card }]}>
        <Search size={18} color={theme.colors.icon} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder={t('common.search') || 'Tìm kiếm...'}
          placeholderTextColor={theme.colors.icon}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <X size={18} color={theme.colors.icon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { styles } from './styles';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: any;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  onSearchChange,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
      <Search size={20} color={theme.colors.icon} />
      <TextInput
        style={[styles.searchInput, { color: theme.colors.text }]}
        placeholder={t('media_gallery.search_placeholder')}
        placeholderTextColor={theme.colors.icon}
        value={searchQuery}
        onChangeText={onSearchChange}
      />
    </View>
  );
};

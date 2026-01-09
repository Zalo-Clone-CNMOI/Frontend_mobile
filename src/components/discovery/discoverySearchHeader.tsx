import { useTheme } from '@/src/theme/themeContext';
import { useRouter } from 'expo-router';
import { QrCode, Search } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function DiscoverySearchHeader({
  onPressSearch,
}: {
  onPressSearch: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.header },
      ]}
    >
      {/* Search icon */}
      <TouchableOpacity onPress={onPressSearch}>
        <Search
          size={20}
          color={theme.colors.iconHeader}
          style={styles.searchIcon}
        />
      </TouchableOpacity>

      {/* Fake search input */}
      <TextInput
        placeholder={t('common.search')}
        placeholderTextColor="#8e8e93"
        style={[
          styles.searchInput,
          { color: theme.colors.text },
        ]}
        showSoftInputOnFocus={false}
        onFocus={onPressSearch}
      />
      <TouchableOpacity style={styles.iconButton}>
        <QrCode size={20} color={theme.colors.iconHeader} onPress={() => router.push('/scanner')} />
      </TouchableOpacity>    
      </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 56,
  },

  searchIcon: {
    marginRight: 6,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    paddingHorizontal: 6,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});

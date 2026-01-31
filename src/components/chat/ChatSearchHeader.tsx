import { useRouter } from 'expo-router';
import { Plus, QrCode, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/themeContext';
import { HeaderMenu } from './HeaderMenu';
import { useTranslation } from 'react-i18next';

export function ChatSearchHeader({
  onPressSearch,
}: {
  onPressSearch: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  return (
    <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
      <TouchableOpacity onPress={onPressSearch}>
        <Search size={20} color={theme.colors.iconHeader} style={styles.searchIcon} />
      </TouchableOpacity>
      <TextInput
        placeholder={t('common.search')}
        placeholderTextColor="#8e8e93"
        style={[styles.searchInput, { color: theme.colors.iconHeader }]}
        showSoftInputOnFocus={false}
        onFocus={onPressSearch}
      />
      <TouchableOpacity style={styles.iconButton}>
        <QrCode size={22} color={theme.colors.iconHeader} onPress={() => router.push('/scanner')} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton}>
        <Plus size={26} color={theme.colors.iconHeader} onPress={() => setMenuVisible(true)} />
      </TouchableOpacity>
      <HeaderMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 56,
  },
  searchIcon: { marginRight: 2},
  searchInput: { flex: 1, fontSize: 16, marginLeft: 10, lineHeight: 24, paddingVertical: 0, padding: 0 },
  iconRight: { marginLeft: 20 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

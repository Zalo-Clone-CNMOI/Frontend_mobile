import { useRouter } from 'expo-router';
import { Bell, Search, UserPlus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/themeContext';

export function ContactsSearchHeader({
  onPressSearch,
}: {
  onPressSearch: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  
  return (
    <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
      <TouchableOpacity onPress={onPressSearch}>
        <Search size={20} color={theme.colors.iconHeader} style={styles.searchIcon} />
      </TouchableOpacity>
      <TextInput
        placeholder={t('contacts.search_placeholder')}
        placeholderTextColor="#8e8e93"
        style={[styles.searchInput, { color: theme.colors.text }]}
        showSoftInputOnFocus={false}
        onFocus={onPressSearch}
      />
      <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/")}>
        <Bell size={20} color={theme.colors.iconHeader} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/addFriend')}>
        <UserPlus size={20} color={theme.colors.iconHeader} />
      </TouchableOpacity>
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
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 10, lineHeight: 24, paddingVertical: 0, padding: 0 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search, Plus, QrCode } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { HeaderMenu } from './HeaderMenu';

export function ChatSearchHeader({
  onPressSearch,
}: {
  onPressSearch: () => void;
}) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onPressSearch}>
        <Search size={20} color="#fff" style={styles.searchIcon} />
      </TouchableOpacity>
      <TextInput
        placeholder="Tìm kiếm"
        placeholderTextColor="#8e8e93"
        style={styles.searchInput}
        showSoftInputOnFocus={false}
        onFocus={onPressSearch}
      />
      <QrCode size={22} color="#fff" style={styles.iconRight} onPress={() => router.push('/scanner')} />
      <Plus size={26} color="#fff" style={styles.iconRight} onPress={() => setMenuVisible(true)} />
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
    backgroundColor: '#1a1a1a',
    height: 56,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 10, lineHeight: 24, paddingVertical: 0, padding: 0 },
  iconRight: { marginLeft: 20 },
});

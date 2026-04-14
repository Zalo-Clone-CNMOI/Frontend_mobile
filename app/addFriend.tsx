import { useAddFriendScreenLogic } from '@/src/hooks/screens/useAddFriendScreen';
import { useCountriesStore } from '@/src/store/useCountriesStore';
import { useTheme } from '@/src/theme/themeContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Clock,
    QrCode,
    Search,
    UserPlus,
    Users,
    X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddFriendScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const countries = useCountriesStore((s) => s.countries);
  const filteredCountries = useCountriesStore((s) => s.filteredCountries);
  const initializeCountries = useCountriesStore((s) => s.initializeCountries);
  const setSearchQuery = useCountriesStore((s) => s.setSearchQuery);
  const searchQuery = useCountriesStore((s) => s.searchQuery);

  const {
    isSearching,
    searchResult,
    searchError,
    isSending,
    searchByPhone,
    sendRequest,
    clearSearch,
  } = useAddFriendScreenLogic();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    countries[0] || { name: t('countries.vietnam'), code: '+84' },
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    initializeCountries();
  }, [initializeCountries]);

  const isValidPhone = phoneNumber.trim().length >= 2;

  const handleSearch = () => {
    if (!isValidPhone) return;
    searchByPhone(phoneNumber);
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    if (searchResult || searchError) clearSearch();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.statusBar }]}
      edges={['top']}
    >
      <StatusBar style="light" />

      
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.statusBar },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>
            {t('add_friend.title')}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        
        <View style={styles.inputSection}>
          <View
            style={[
              styles.phoneInputContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: isFocused || phoneNumber ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity style={styles.countryCode} onPress={() => setModalVisible(true)}>
              <Text style={[styles.countryText, { color: theme.colors.text }]}>
                {selectedCountry.code}
              </Text>
              <ChevronDown size={16} color="#8e8e93" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t('add_friend.phone_placeholder')}
              placeholderTextColor="#8e8e93"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />

            {phoneNumber.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setPhoneNumber('');
                  clearSearch();
                }}
              >
                <X size={16} color="#8e8e93" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              disabled={!isValidPhone || isSearching}
              onPress={handleSearch}
              style={[
                styles.searchBtn,
                {
                  backgroundColor: isValidPhone ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ArrowRight size={18} color={isValidPhone ? '#fff' : '#999'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        
        {isSearching && !searchResult && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.icon }]}>
              Đang tìm kiếm...
            </Text>
          </View>
        )}

        {searchError && (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.card }]}>
            <Users size={40} color={theme.colors.border} />
            <Text style={[styles.errorText, { color: theme.colors.icon }]}>{searchError}</Text>
          </View>
        )}

        {searchResult && (
          <View style={[styles.resultCard, { backgroundColor: theme.colors.card }]}>
            <Image
              source={{
                uri:
                  searchResult.avatarUrl ||
                  `https://i.pravatar.cc/120?u=${searchResult.id}`,
              }}
              style={styles.resultAvatar}
            />
            <View style={styles.resultInfo}>
              <Text style={[styles.resultName, { color: theme.colors.text }]}>
                {searchResult.fullName}
              </Text>
              {searchResult.phone && (
                <Text style={[styles.resultPhone, { color: theme.colors.icon }]}>
                  {searchResult.phone}
                </Text>
              )}
            </View>

            
            {searchResult.status === 'self' && (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.border }]}>
                <Text style={[styles.statusText, { color: theme.colors.icon }]}>Tài khoản của bạn</Text>
              </View>
            )}
            {searchResult.status === 'friend' && (
              <View style={[styles.statusBadge, { backgroundColor: '#e8f5e9' }]}>
                <Check size={14} color="#4caf50" />
                <Text style={[styles.statusText, { color: '#4caf50' }]}>Bạn bè</Text>
              </View>
            )}
            {searchResult.status === 'sent' && (
              <View style={[styles.statusBadge, { backgroundColor: '#fff3e0' }]}>
                <Clock size={14} color="#fb8c00" />
                <Text style={[styles.statusText, { color: '#fb8c00' }]}>Đã gửi lời mời</Text>
              </View>
            )}
            {searchResult.status === 'received' && (
              <View style={[styles.statusBadge, { backgroundColor: '#e3f2fd' }]}>
                <Clock size={14} color={theme.colors.primary} />
                <Text style={[styles.statusText, { color: theme.colors.primary }]}>
                  Đã nhận lời mời
                </Text>
              </View>
            )}
            {searchResult.status === 'none' && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => sendRequest(searchResult.id)}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <UserPlus size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Kết bạn</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        
        {!searchResult && !searchError && !isSearching && (
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/scanner')}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                <QrCode size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                {t('add_friend.scan_qr')}
              </Text>
              <ArrowRight size={18} color={theme.colors.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/friends/requests')}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                <Users size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                Lời mời kết bạn
              </Text>
              <ArrowRight size={18} color={theme.colors.icon} />
            </TouchableOpacity>
          </View>
        )}

        
        <Modal visible={modalVisible} animationType="slide">
          <SafeAreaView style={[styles.modalBg, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ArrowLeft size={24} color={theme.colors.icon} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('add_friend.select_country')}
              </Text>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.colors.card }]}>
              <Search size={20} color="#8e8e93" />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder={t('add_friend.search_country')}
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={[styles.itemFlagText, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemCodeText, { color: theme.colors.primary }]}>
                    {item.code}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 56,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitle: { fontSize: 18, fontWeight: '600' },

  inputSection: { paddingHorizontal: 16, paddingTop: 16 },

  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    paddingHorizontal: 12,
  },
  countryCode: { flexDirection: 'row', alignItems: 'center' },
  countryText: { fontSize: 16, marginRight: 4, fontWeight: '500' },
  divider: { width: 1, height: 24, marginHorizontal: 10 },
  input: { flex: 1, fontSize: 16 },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  
  loadingWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  loadingText: { fontSize: 14 },

  
  errorCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  errorText: { fontSize: 14, textAlign: 'center' },

  
  resultCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  resultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  resultInfo: { flex: 1, marginLeft: 14 },
  resultName: { fontSize: 16, fontWeight: '700' },
  resultPhone: { fontSize: 13, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  
  menuSection: { paddingHorizontal: 16, marginTop: 20, gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '500' },

  
  modalBg: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginLeft: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  itemFlagText: { fontSize: 16 },
  itemCodeText: { fontSize: 16, fontWeight: '500' },
});

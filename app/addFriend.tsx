import { useCountriesStore } from '@/src/store/useCountriesStore';
import { useTheme } from '@/src/theme/themeContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  QrCode,
  Search,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    countries[0] || { name: 'Việt Nam', code: '+84' }
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    initializeCountries();
  }, [initializeCountries]);

  const isValidPhone = phoneNumber.length >= 10;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}
    >
      <StatusBar style="light" />
      {/* Header chuẩn Zalo */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.statusBar },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={28} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.iconHeader },
            ]}
          >
            {t('add_friend.title')}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.content}>
        {/* ================= QR CARD ================= */}
        <View
          style={[
            styles.qrCard,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <Text
            style={[
              styles.userName,
              { color: theme.colors.text },
            ]}
          >
            {t('add_friend.user_name')}
          </Text>

          <View style={styles.qrContainer}>
            <Image
              source={{
                uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Zalo',
              }}
              style={styles.qrImage}
            />
          </View>

          <Text style={styles.qrSubText}>
            {t('add_friend.qr_description')}
          </Text>
        </View>

        {/* ================= PHONE INPUT ================= */}
        <View style={styles.inputWrapper}>
          <View
            style={[
              styles.phoneInputContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor:
                  isFocused || phoneNumber
                    ? theme.colors.primary
                    : theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.countryCode}
              onPress={() => setModalVisible(true)}
            >
              <Text
                style={[
                  styles.countryText,
                  { color: theme.colors.text },
                ]}
              >
                {selectedCountry.code}
              </Text>
              <ChevronDown size={16} color="#8e8e93" />
            </TouchableOpacity>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.border },
              ]}
            />

            <TextInput
              style={[
                styles.input,
                { color: theme.colors.text },
              ]}
              placeholder={t('add_friend.phone_placeholder')}
              placeholderTextColor="#8e8e93"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            <TouchableOpacity
              disabled={!isValidPhone}
              style={[
                styles.nextBtn,
                {
                  backgroundColor: isValidPhone
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <ArrowRight
                size={20}
                color={isValidPhone ? '#fff' : '#666'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= MENU ================= */}
        <View style={styles.menuSection}>
          <MenuItem
            icon={<QrCode size={22} color={theme.colors.primary} />}
            title={t('add_friend.scan_qr')}
            onPress={() => router.push('/scanner')}
            borderColor={theme.colors.border}
            textColor={theme.colors.text}
          />

          <MenuItem
            icon={<Users size={22} color={theme.colors.primary} />}
            title={t('add_friend.suggested_friends')}
            borderColor={theme.colors.border}
            textColor={theme.colors.text}
          />
        </View>
      </View>

      {/* ================= MODAL ================= */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView
          style={[
            styles.modalBg,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <ArrowLeft size={24} color={theme.colors.icon} />
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                { color: theme.colors.text },
              ]}
            >
              {t('add_friend.select_country')}
            </Text>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Search size={20} color="#8e8e93" />
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.colors.text },
              ]}
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
                style={[
                  styles.countryItem,
                  { borderBottomColor: theme.colors.border },
                ]}
                onPress={() => {
                  setSelectedCountry(item);
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.itemFlagText,
                    { color: theme.colors.text },
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.itemCodeText,
                    { color: theme.colors.primary },
                  ]}
                >
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

/* ================= COMPONENT ================= */

function MenuItem({
  icon,
  title,
  onPress,
  borderColor,
  textColor,
}: any) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: borderColor },
      ]}
      onPress={onPress}
    >
      <View style={styles.iconWrapper}>{icon}</View>
      <Text style={[styles.menuText, { color: textColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 56,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  qrCard: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
  },

  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },

  qrContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
  },

  qrImage: { width: 150, height: 150 },

  qrSubText: {
    marginTop: 20,
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },

  inputWrapper: { width: '100%', marginTop: 30 },

  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    paddingHorizontal: 12,
  },

  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  countryText: {
    fontSize: 16,
    marginRight: 4,
  },

  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
  },

  nextBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuSection: { width: '100%', marginTop: 20 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },

  iconWrapper: { width: 40 },

  menuText: { fontSize: 16 },

  modalBg: { flex: 1 },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },

  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },

  itemFlagText: { fontSize: 16 },

  itemCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

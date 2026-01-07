import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  QrCode,
  Users,
  ChevronDown,
  Search,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/src/constants/Colors";
import { useCountriesStore } from "@/src/store/useCountriesStore";

export default function AddFriendScreen() {
  const router = useRouter();

  // Get state and actions from store
  const countries = useCountriesStore((state) => state.countries);
  const filteredCountries = useCountriesStore((state) => state.filteredCountries);
  const initializeCountries = useCountriesStore((state) => state.initializeCountries);
  const setSearchQuery = useCountriesStore((state) => state.setSearchQuery);

  // Local state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0] || { name: "Việt Nam", code: "+84" });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    initializeCountries();
  }, [initializeCountries]);

  const isValidPhone = phoneNumber.length >= 10;

  const handleCountrySearch = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm bạn</Text>
      </View>

      <View style={styles.content}>
        {/* Card QR Code */}
        <View style={styles.qrCard}>
          <Text style={styles.userName}>Mai Huỳnh Dương Tuấn K...</Text>
          <View style={styles.qrContainer}>
            <Image
              source={{
                uri: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Zalo",
              }}
              style={styles.qrImage}
            />
          </View>
          <Text style={styles.qrSubText}>Quét mã để thêm bạn Zalo với tôi</Text>
        </View>

        {/* Input Số điện thoại */}
        <View style={styles.inputWrapper}>
          <View style={[
            styles.phoneInputContainer,
            // Đổi màu viền xanh khi focus HOẶC khi đã nhập nội dung
            (isFocused || phoneNumber.length > 0) && { borderColor: '#6489e0', borderWidth: 1.5 }
          ]}>
            <TouchableOpacity
              style={styles.countryCode}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.countryText}>{selectedCountry.code}</Text>
              <ChevronDown color="#8e8e93" size={16} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            {/* Nút mũi tên sẽ sáng lên (màu Zalo Blue) khi số điện thoại hợp lệ */}
            <TouchableOpacity
              style={[
                styles.nextBtn,
                isValidPhone && { backgroundColor: Colors.zaloBlue }
              ]}
              disabled={!isValidPhone}
              onPress={() => console.log("Tìm kiếm bạn:", phoneNumber)}
            >
              <ArrowRight
                color={isValidPhone ? "#fff" : "#444"}
                size={20}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/scanner')}>
            <View style={styles.iconWrapper}>
              <QrCode color={Colors.zaloBlue} size={22} />
            </View>
            <Text style={styles.menuText}>Quét mã QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.iconWrapper}>
              <Users color={Colors.zaloBlue} size={22} />
            </View>
            <Text style={styles.menuText}>Bạn bè có thể quen</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- MODAL CHỌN QUỐC GIA (TỰ VIẾT) --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn quốc gia</Text>
          </View>

          {/* Ô tìm kiếm trong Modal */}
          <View style={styles.searchBox}>
            <Search color="#8e8e93" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm quốc gia"
              placeholderTextColor="#8e8e93"
              onChangeText={handleCountrySearch}
              value={useCountriesStore((state) => state.searchQuery)}
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => {
                  setSelectedCountry(item);
                  setModalVisible(false);
                  useCountriesStore.setState({ searchQuery: "" });
                }}
              >
                <Text style={styles.itemFlagText}>{item.name}</Text>
                <Text style={styles.itemCodeText}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: { marginRight: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 20, alignItems: "center" },
  qrCard: {
    backgroundColor: "#3a4a5e",
    width: "90%",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    alignItems: "center",
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  qrContainer: { backgroundColor: "#fff", padding: 10, borderRadius: 12 },
  qrImage: { width: 150, height: 150 },
  qrSubText: { color: "#cbd5e0", marginTop: 20, fontSize: 14 },
  inputWrapper: { width: "100%", marginTop: 30 },
  phoneInputContainer: {
    flexDirection: "row",
    textAlign: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#817c7cff",
    height: 56,
    paddingHorizontal: 12,
  },
  countryCode: { flexDirection: "row", alignItems: "center", paddingRight: 8 },
  countryText: { color: "#fff", fontSize: 16, marginRight: 4 },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#333",
    marginHorizontal: 10,
  },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  nextBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 5,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  menuSection: { width: "100%", marginTop: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  iconWrapper: { width: 40 },
  menuText: { color: "#fff", fontSize: 16 },
  // Modal Styles
  modalBg: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: { flex: 1, color: "#fff", marginLeft: 10, fontSize: 16 },
  countryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0.3,
    borderBottomColor: "#222",
  },
  itemFlagText: { color: "#fff", fontSize: 16 },
  itemCodeText: { color: Colors.zaloBlue, fontSize: 16, fontWeight: "500" },
});

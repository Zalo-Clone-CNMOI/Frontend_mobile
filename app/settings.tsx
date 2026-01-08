import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Palette,
  Info,
  LifeBuoy,
  Users,
  LogOut,
  ChevronRight,
  Search,
  ChevronLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";

const SettingItem = ({ icon: Icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.item} onPress={onPress}>
    <View style={styles.itemLeft}>
      <Icon size={22} color="#0091ff" />
      <Text style={styles.itemTitle}>{title}</Text>
    </View>
    <View style={styles.itemRight}>
      <ChevronRight size={20} color="#555" />
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      {/* Header chuẩn Zalo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cài đặt</Text>
        </View>
        <Search size={24} color="#fff" />
      </View>

      <ScrollView>
        {/* <SettingItem icon={ShieldCheck} title="Tài khoản và bảo mật" />
        <SettingItem icon={Lock} title="Quyền riêng tư" />
        <View style={styles.divider} />

        <SettingItem icon={Database} title="Dữ liệu trên máy" />
        <SettingItem icon={RefreshCcw} title="Sao lưu và khôi phục" />
        <View style={styles.divider} />

        <SettingItem icon={Bell} title="Thông báo" />
        <SettingItem icon={MessageCircle} title="Tin nhắn" />
        <SettingItem icon={Phone} title="Cuộc gọi" />
        <SettingItem icon={Clock} title="Nhật ký" />
        <SettingItem icon={Contact2} title="Danh bạ" />
        <View style={styles.divider} /> */}

        <SettingItem icon={Palette} title="Giao diện và ngôn ngữ" onPress={() => router.push('/appearance')} />
        <View style={styles.divider} />

        <SettingItem icon={Info} title="Thông tin về Zalo" />
        <SettingItem icon={LifeBuoy} title="Liên hệ hỗ trợ" />
        <View style={styles.divider} />

        <SettingItem icon={Users} title="Chuyển tài khoản" />

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  itemTitle: { color: "#fff", fontSize: 16 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  warningDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff4d4f",
    alignItems: "center",
    justifyContent: "center",
  },
  warningText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  divider: { height: 8, backgroundColor: "#111" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626",
    margin: 20,
    padding: 12,
    borderRadius: 25,
    gap: 10,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

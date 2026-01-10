import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  LifeBuoy,
  LogOut,
  Palette,
  Search,
  Users,
} from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from '../src/theme/themeContext';
import { useTranslation } from "react-i18next";

const SettingItem = ({ icon: Icon, title, onPress }: any) => {
  const theme = useTheme();
  return (
    <TouchableOpacity style={[styles.item, { backgroundColor: theme.colors.background }]} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Icon size={22} color={theme.colors.primary} />
        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      <View style={styles.itemRight}>
        <ChevronRight size={20} color="#555" />
      </View>
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header chuẩn Zalo */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('settings.title')}</Text>
        </View>
        <Search size={24} color={theme.colors.text} />
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

        <SettingItem icon={Palette} title={t('settings.appearance_language')} onPress={() => router.push('/appearance')} />
        <View style={styles.divider} />

        <SettingItem icon={Info} title={t('settings.about')} />
        <SettingItem icon={LifeBuoy} title={t('settings.contact')} />
        <View style={styles.divider} />

        <SettingItem icon={Users} title={t('settings.account')} />

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.colors.card , borderColor: theme.colors.border }]} onPress={() => router.push('/')}>
          <LogOut size={20} color={theme.colors.text} />
          <Text style={[styles.logoutText, { color: theme.colors.text }]}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  itemTitle: { fontSize: 16 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  warningDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff4d4f",
    alignItems: "center",
    justifyContent: "center",
  },
  warningText: { fontSize: 12, fontWeight: "bold" },
  divider: { height: 8 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 12,
    borderRadius: 25,
    gap: 10,
  },
  logoutText: { fontSize: 16, fontWeight: "600" },
});

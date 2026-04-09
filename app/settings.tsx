import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    ChevronLeft,
    ChevronRight,
    Info,
    LifeBuoy,
    LogOut,
    Palette,
    Users
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from '../src/theme/themeContext';

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      {/* Header chuẩn Zalo */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border },{backgroundColor: theme.colors.statusBar}]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={theme.colors.iconHeader} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>{t('settings.title')}</Text>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView>
        {/* <SettingItem icon={ShieldCheck} title={t('settings.account')} />
        <SettingItem icon={Lock} title={t('settings.privacy')} />
        <View style={styles.divider} />

        <SettingItem icon={Database} title={t('settings.data_storage')} />
        <SettingItem icon={RefreshCcw} title={t('settings.backup_restore')} />
        <View style={styles.divider} />

        <SettingItem icon={Bell} title={t('settings.notifications_menu')} />
        <SettingItem icon={MessageCircle} title={t('settings.messages_menu')} />
        <SettingItem icon={Phone} title={t('settings.calls_menu')} />
        <SettingItem icon={Clock} title={t('settings.timeline_menu')} />
        <SettingItem icon={Contact2} title={t('settings.contacts_menu')} />
        <View style={styles.divider} /> */}

        <SettingItem icon={Palette} title={t('settings.appearance_language')} onPress={() => router.push('/appearance')} />
        <View style={styles.divider} />

        <SettingItem icon={Info} title={t('settings.about')} />
        <SettingItem icon={LifeBuoy} title={t('settings.contact')} />
        <View style={styles.divider} />

        <SettingItem icon={Users} title={t('settings.account')} onPress={() => router.push('/account')} />

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.colors.card , borderColor: theme.colors.border }]} onPress={() => router.push('/')}>
          <LogOut size={20} color={theme.colors.text} />
          <Text style={[styles.logoutText, { color: theme.colors.text }]}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
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

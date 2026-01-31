  import { useContactsStore } from "@/src/store/useContactsStore";
import { useTheme } from "@/src/theme/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme(); // ✅ DÙNG THEME
  const { t } = useTranslation();

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nameFocused, setNameFocused] = useState(false);

  const friends = useContactsStore((state) => state.friends);
  const initializeContacts = useContactsStore(
    (state) => state.initializeContacts
  );

  useEffect(() => {
    initializeContacts();
  }, [initializeContacts]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.statusBar }]} edges={['top']}>
      <StatusBar style="light" />
      {/* Header chuẩn Zalo */}
      <View style={[styles.navBar, { borderBottomColor: colors.border, backgroundColor: colors.statusBar }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color={colors.iconHeader} />
          </TouchableOpacity>
          <View style={{ marginLeft: 16 }}>
            <Text style={[styles.navTitle, { color: colors.iconHeader }]}>
              {t('create_group.title')}
            </Text>
            <Text style={[styles.navSub, { color: colors.iconHeader }]}>
              {t('create_group.selected_count', { count: selectedIds.length })}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.background }]}>
        {/* Tên nhóm */}
        <View
          style={[
            styles.groupNameInput,
            {
              backgroundColor: colors.card,
              borderColor: nameFocused || groupName
                ? colors.primary
                : colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: colors.border }]}
          >
            <Camera size={22} color={colors.text} />
          </TouchableOpacity>

          <TextInput
            placeholder={t('create_group.name_placeholder')}
            placeholderTextColor={colors.text}
            style={[styles.nameInput, { color: colors.text }]}
            value={groupName}
            onChangeText={setGroupName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.text} />
          <TextInput
            placeholder="Tìm tên hoặc số điện thoại"
            placeholderTextColor={colors.text}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={[styles.tabHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tabActive, { color: colors.text, borderBottomColor: colors.text }]}>
            Bạn bè
          </Text>
        </View>
      </View>

      {/* Danh sách bạn */}
      <FlatList
        data={friends.filter((f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity style={styles.friendRow} onPress={() => handleSelect(item.id)}>
              <View style={styles.avatarWrapper}>
                {item.color ? (
                  <View style={[styles.avatarText, { backgroundColor: item.color }]}>
                    <Text style={styles.atText}>PN</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                )}
              </View>

              <View style={styles.friendInfo}>
                <Text style={[styles.fName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.fTime, { color: colors.text }]}>
                  {item.time}
                </Text>
              </View>

              <View
                style={[
                  styles.checkCircle,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : "transparent",
                  },
                ]}
              >
                {selected && <Check size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Footer */}
      {selectedIds.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedList}>
            {selectedIds.map((id) => {
              const f = friends.find((i) => i.id === id);
              return (
                <View key={id} style={styles.selectedItem}>
                  <Image source={{ uri: f?.avatar }} style={styles.selectedAvatar} />
                  <TouchableOpacity
                    style={[styles.removeX, { backgroundColor: colors.border }]}
                    onPress={() => handleSelect(id)}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={[styles.fabBtn, { backgroundColor: colors.primary }]}>
            <ArrowRight size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },

  navBar: {
    height: 56,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },

  navTitle: { fontSize: 18, fontWeight: "600" },
  navSub: { fontSize: 13 },
  headerCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },

  groupNameInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
  },

  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  nameInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },

  tabHeader: {
    marginTop: 16,
    borderBottomWidth: 0.5,
  },

  tabActive: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    fontWeight: "600",
  },

  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },

  avatarWrapper: { width: 50, height: 50 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarText: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  atText: { color: "#fff", fontWeight: "bold" },

  friendInfo: { flex: 1, marginLeft: 15 },
  fName: { fontSize: 16 },
  fTime: { fontSize: 13, marginTop: 4 },

  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 0.5,
  },

  selectedList: { flex: 1 },
  selectedItem: { marginRight: 12 },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22 },

  removeX: {
    position: "absolute",
    top: -2,
    right: -2,
    borderRadius: 10,
    padding: 2,
  },

  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});

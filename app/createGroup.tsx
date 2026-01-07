import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import {
  Camera,
  Search,
  X,
  ArrowRight,
  ChevronLeft,
  Check,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useContactsStore } from "@/src/store/useContactsStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";

export default function CreateGroupScreen() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    <SafeAreaView style={styles.container}>
      {/* Thanh điều hướng Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ marginLeft: 15 }}>
          <Text style={styles.navTitle}>Nhóm mới</Text>
          <Text style={styles.navSub}>Đã chọn: {selectedIds.length}</Text>
        </View>
      </View>

      <View style={styles.headerCard}>
        <View style={styles.groupNameInput}>
          <TouchableOpacity style={styles.cameraBtn}>
            <Camera size={22} color="#8e8e93" />
          </TouchableOpacity>
          <TextInput
            placeholder="Đặt tên nhóm"
            placeholderTextColor="#8e8e93"
            style={styles.nameInput}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color="#8e8e93" />
          <TextInput
            placeholder="Tìm tên hoặc số điện thoại"
            placeholderTextColor="#8e8e93"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.tabHeader}>
          <Text style={styles.tabActive}>Bạn bè</Text>
        </View>
      </View>

      <FlatList
        data={friends.filter((f) => f.name.includes(searchQuery))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendRow}
            onPress={() => handleSelect(item.id)}
          >
            <View style={styles.avatarWrapper}>
              {item.color ? (
                <View
                  style={[styles.avatarText, { backgroundColor: item.color }]}
                >
                  <Text style={styles.atText}>PN</Text>
                </View>
              ) : (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              )}
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.fName}>{item.name}</Text>
              <Text style={styles.fTime}>{item.time}</Text>
            </View>
            <View
              style={[
                styles.checkCircle,
                selectedIds.includes(item.id) && styles.checkActive,
              ]}
            >
              {selectedIds.includes(item.id) && (
               <Check  color="#fff" style={[styles.checkActive,styles.checkCircle]} />
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Footer hiển thị người đã chọn */}
      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedList}
          >
            {selectedIds.map((id) => {
              const f = friends.find((item) => item.id === id);
              return (
                <View key={id} style={styles.selectedItem}>
                  <Image
                    source={{ uri: f?.avatar }}
                    style={styles.selectedAvatar}
                  />
                  <TouchableOpacity
                    style={styles.removeX}
                    onPress={() => handleSelect(id)}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => console.log("Tạo nhóm:", groupName)}
          >
            <ArrowRight size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  navTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  navSub: { color: "#8e8e93", fontSize: 13 },
  headerTop: { padding: 16 },
  groupNameInput: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cameraBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    marginLeft: 15,
    color: "#fff",
    fontSize: 17,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    paddingBottom: 5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
  },
  searchInput: { flex: 1, color: "#fff", marginLeft: 10 },
  searchTypeIcon: {
    color: "#8e8e93",
    borderLeftWidth: 1,
    borderLeftColor: "#333",
    paddingLeft: 10,
  },
  tabHeader: {
    flexDirection: "row",
    marginTop: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  tabActive: {
    color: "#fff",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
    marginRight: 30,
    fontWeight: "600",
  },
  tabInactive: { color: "#8e8e93", marginRight: 30 },
  friendRow: { flexDirection: "row", alignItems: "center", padding: 15 },
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
  fName: { color: "#fff", fontSize: 16 },
  fTime: { color: "#8e8e93", fontSize: 13, marginTop: 4 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#555",
  },
  checkActive: { backgroundColor: Colors.zaloBlue, borderColor: Colors.zaloBlue },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#111",
    borderTopWidth: 0.5,
    borderTopColor: "#222",
  },
  selectedList: { flex: 1 },
  selectedItem: { marginRight: 15 },
  selectedAvatar: { width: 45, height: 45, borderRadius: 22.5 },
  removeX: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#555",
    borderRadius: 10,
    padding: 2,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.zaloBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#000',
},





});

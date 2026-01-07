import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { UserPlus, Users, Cloud, Calendar, Video, Monitor } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

type HeaderMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function HeaderMenu({ visible, onClose }: HeaderMenuProps) {
  const menuItems = [
    { icon: UserPlus, label: 'Thêm bạn' , onPress: () => router.push('/addFriend')},
    { icon: Users, label: 'Tạo nhóm' , onPress: () => router.push('/createGroup')},
    { icon: Cloud, label: 'My Documents' , onPress: () => router.push('/myDocuments')},

  ];

  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Pressable key={index} style={styles.menuItem} onPress={() => {
                item.onPress();
                onClose();
            }}>
              <item.icon size={20} color="#ccc" strokeWidth={1.5} />
              <Text style={styles.menuText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', 
  },
  menuContainer: {
    position: 'absolute',
    right: 2,
    top:2,
    backgroundColor: '#2b2b2b',
    borderRadius: 8,
    width: 220,
    paddingVertical: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
});
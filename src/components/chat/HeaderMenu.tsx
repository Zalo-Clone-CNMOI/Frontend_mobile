import { useTheme } from '@/src/theme/themeContext';
import { useRouter } from 'expo-router';
import { Cloud, UserPlus, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

type HeaderMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function HeaderMenu({ visible, onClose }: HeaderMenuProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const menuItems = [
    { icon: UserPlus, label: t('chat.header_menu.add_friend') , onPress: () => router.push('/addFriend' as any)},
    { icon: Users, label: t('chat.header_menu.create_group') , onPress: () => router.push('/createGroup' as any)},
    { icon: Cloud, label: t('chat.header_menu.my_documents') , onPress: () => router.push('/myDocuments' as any)},

  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        
        <View style={[styles.menuContainer, { backgroundColor: theme.colors.background }]}>
          {menuItems.map((item, index) => (
            <Pressable key={index} style={styles.menuItem} onPress={() => {
                item.onPress();
                onClose();
            }}>
              <item.icon size={20} color={theme.colors.text} strokeWidth={1.5} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>{item.label}</Text>
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
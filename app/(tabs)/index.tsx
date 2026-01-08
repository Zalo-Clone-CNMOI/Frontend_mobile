import { ChatListItem } from '@/src/components/chat/ChatListItem';
import { ChatSearchHeader } from '@/src/components/chat/ChatSearchHeader';
import { useChatsStore } from '@/src/store/useChatsStore';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Filter } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const router = useRouter();
    const chats = useChatsStore((state) => state.chats);
    const initializeChats = useChatsStore((state) => state.initializeChats);
    const filterTab = useChatsStore((state) => state.filterTab);
    const filteredChats = useChatsStore((state) => state.filteredChats);

    useEffect(() => {
        initializeChats();
    }, [initializeChats]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
            <ChatSearchHeader onPressSearch={() => router.push('/search')}/>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <View style={styles.activeTabContainer}>
                    <Text style={styles.activeTabText}>Ưu tiên</Text>
                    <View style={styles.activeLine} />
                </View>
                <Text style={styles.inactiveTabText}>{'Khác'}</Text>
                <Filter size={18} color="#8e8e93" style={{ marginLeft: 'auto' }} />
            </View>

            {/* Chat List */}
            <FlashList
                data={chats}
                keyExtractor={(item) => item.conversationId}
                renderItem={({ item }) => (
                    <ChatListItem
                        item={item}
                        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.conversationId, name: item.name } })}
                    />
                )}
            />
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#000'
    },
    container: { flex: 1, backgroundColor: '#000' },
    filterContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#222' },
    activeTabContainer: { alignItems: 'flex-start' },
    activeTabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    activeLine: { height: 2, backgroundColor: '#fff', marginTop: 4 },
    inactiveTabText: { color: '#8e8e93', fontSize: 15, marginLeft: 25 },
});
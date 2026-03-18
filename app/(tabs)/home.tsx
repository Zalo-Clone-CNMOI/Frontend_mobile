import { ChatListItem } from '@/src/components/chat/ChatListItem';

import { ChatSearchHeader } from '@/src/components/chat/ChatSearchHeader';

import { useChatsStore } from '@/src/store/useChatsStore';

import { useTheme } from '@/src/theme/themeContext';

import { FlashList } from '@shopify/flash-list';

import { useRouter } from 'expo-router';

import { Filter } from 'lucide-react-native';

import React, { useCallback, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';



export default function HomeScreen() {

    const router = useRouter();

    const chats = useChatsStore((state) => state.chats);
    console.log('Chats in HomeScreen:', chats, '\n lenght:', chats.length, '\n'); // Debug log to check chat data

    const initializeChats = useChatsStore((state) => state.initializeChats);

    const filterTab = useChatsStore((state) => state.filterTab);

    const filteredChats = useChatsStore((state) => state.filteredChats);



    const theme = useTheme();

    const { t } = useTranslation();
    const [refreshing, setRefreshing] = useState(false);



    useEffect(() => {

        initializeChats();

    }, [initializeChats]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await initializeChats();
        } catch (e) {
            console.warn('Refresh failed', e);
        } finally {
            setRefreshing(false);
        }
    }, [initializeChats]);

    return (
        <SafeAreaView  style={[styles.safeArea, { backgroundColor: theme.colors.statusBar }]} edges={['top']}>
            <StatusBar style="light" />
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ChatSearchHeader onPressSearch={() => router.push('/search')} />
                {/* Filter Tabs */}
                <View style={[styles.filterContainer, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.activeTabContainer}>
                        <Text style={[styles.activeTabText, { color: theme.colors.text }]}>{t('messages.title')}</Text>
                        <View style={[styles.activeLine, { backgroundColor: theme.colors.text }]} />
                    </View>
                    <Filter size={18} color="#8e8e93" style={{ marginLeft: 'auto' }} />
                </View>
                {/* Chat List */}
                <FlashList
                    data={chats}
                    keyExtractor={(item: any) => item.conversationId || item.id || item._id || ''}
                    estimatedItemSize={80}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.text }}>{t('messages.empty') || 'No conversations yet'}</Text>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        console.log('🏠 Chat item in home:', JSON.stringify(item, null, 2));
                        
                        // Handle different conversation ID field names
                        const conversationId = (item as any).conversationId || (item as any).id || (item as any)._id;
                        console.log('🏠 Extracted conversation ID:', conversationId);
                        
                        if (!conversationId) {
                            console.error('❌ No conversation ID found in chat item:', item);
                            return null;
                        }
                        
                        return (
                            <ChatListItem
                                item={item}
                                onPress={() => {
                                    console.log('🏠 Navigating to chat with ID:', conversationId, 'name:', item.name);
                                    try {
                                        // Method 1: router.push with object
                                        router.push({ 
                                            pathname: '/chat/[id]', 
                                            params: { 
                                                id: conversationId, 
                                                name: item.name || 'Chat' 
                                            } 
                                        });
                                    } catch (pushError) {
                                        console.warn('❌ router.push failed, trying router.navigate:', pushError);
                                        try {
                                            // Method 2: router.navigate
                                            router.navigate({
                                                pathname: '/chat/[id]',
                                                params: {
                                                    id: conversationId,
                                                    name: item.name || 'Chat'
                                                }
                                            });
                                        } catch (navError) {
                                            console.warn('❌ router.navigate failed, trying string syntax:', navError);
                                            try {
                                                // Method 3: router.push with string
                                                router.push(`/chat/${conversationId}?name=${encodeURIComponent(item.name || 'Chat')}`);
                                            } catch (stringError) {
                                                console.warn('❌ All navigation methods failed:', stringError);
                                                console.log('🔗 Manual navigation URL:', `/chat/${conversationId}?name=${encodeURIComponent(item.name || 'Chat')}`);
                                            }
                                        }
                                    }
                                }}
                            />
                        );
                    }}
                />

            </View>
        </SafeAreaView>

    );
}


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: { flex: 1 },
    filterContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5 },
    activeTabContainer: { alignItems: 'flex-start' },
    activeTabText: { fontWeight: 'bold', fontSize: 15 },
    activeLine: { height: 2, marginTop: 4 },
    inactiveTabText: { fontSize: 15, marginLeft: 25 },
});
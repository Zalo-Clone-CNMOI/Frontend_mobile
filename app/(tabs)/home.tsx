import { ChatListItem } from '@/src/components/chat/ChatListItem';

import { ChatSearchHeader } from '@/src/components/chat/ChatSearchHeader';

import { useChatsStore } from '@/src/store/useChatsStore';

import { useTheme } from '@/src/theme/themeContext';

import { FlashList } from '@shopify/flash-list';

import { useRouter } from 'expo-router';

import { Filter } from 'lucide-react-native';

import React, { useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';



export default function HomeScreen() {

    const router = useRouter();

    const chats = useChatsStore((state) => state.chats);

    const initializeChats = useChatsStore((state) => state.initializeChats);

    const filterTab = useChatsStore((state) => state.filterTab);

    const filteredChats = useChatsStore((state) => state.filteredChats);



    const theme = useTheme();

    const { t } = useTranslation();



    useEffect(() => {

        initializeChats();

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
                    keyExtractor={(item) => item.conversationId}

                    renderItem={({ item }) =>

                        <ChatListItem

                            item={item}

                            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.conversationId, name: item.name } })}

                        />

                    }

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
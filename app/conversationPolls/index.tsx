import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { usePollStore } from '@/src/store/usePollStore';
import { useTheme } from '@/src/theme/themeContext';
import { PollListItem } from '@/src/types/dto/PollDTO';
import { CreatePollModal } from '@/src/components/chat/CreatePollModal';
import { PollCard } from '@/src/components/conversationPolls/PollCard';
import { TabBar } from '@/src/components/conversationPolls/TabBar';
import { EmptyState } from '@/src/components/conversationPolls/EmptyState';
import { styles } from '@/src/components/conversationPolls/styles';

export default function ConversationPollsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { conversationId, chatName } = useLocalSearchParams<{
    conversationId: string;
    chatName?: string;
  }>();

  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pollsStore = usePollStore();
  const polls = pollsStore.getPollsForConversation(conversationId);

  const filteredPolls = polls.filter(p => {
    const isExpired = p.expires_at && p.expires_at < Date.now();
    const isActive = p.status === 'active' && !isExpired;
    const isClosed = p.status === 'closed' || isExpired;

    if (activeTab === 'active') {
      return isActive;
    } else {
      return isClosed;
    }
  });

  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all polls without status filter - filter on frontend
      await pollsStore.fetchPolls(conversationId, {
        page: 1,
        limit: 20
      });
    } catch (error) {
      console.error('[ConversationPolls] Failed to fetch polls:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      fetchPolls();
    }
  }, [conversationId, activeTab]);

  // Refresh polls when screen comes into focus (after closing poll modal)
  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        fetchPolls();
      }
    }, [conversationId])
  );

  const handleVote = useCallback((pollId: string) => {
    router.push({
      pathname: `/chat/${conversationId}`,
      params: { highlightPollId: pollId }
    } as any);
  }, [conversationId, router]);

  const handleViewResults = useCallback((pollId: string) => {
    router.push({
      pathname: `/chat/${conversationId}`,
      params: { highlightPollId: pollId }
    } as any);
  }, [conversationId, router]);

  const handlePollCreated = useCallback((pollId: string, messageId: string) => {
    fetchPolls();
  }, [fetchPolls]);

  const renderPollItem = ({ item }: { item: PollListItem }) => (
    <PollCard 
      poll={item} 
      onVote={handleVote}
      onViewResults={handleViewResults}
      theme={theme}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.statusBar }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={theme.colors.iconHeader} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.iconHeader }]}>
          {t('polls_screen.title')}
        </Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setCreateModalVisible(true)}
        >
          <Plus size={28} color={theme.colors.iconHeader} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <TabBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        theme={theme}
      />

      {/* Poll List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredPolls.length === 0 ? (
        <EmptyState
          activeTab={activeTab}
          onCreatePoll={() => setCreateModalVisible(true)}
          theme={theme}
        />
      ) : (
        <FlatList
          data={filteredPolls}
          keyExtractor={(item) => item.poll_id}
          renderItem={renderPollItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Poll Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.createButtonText}>{t('poll.createTitle')}</Text>
        </TouchableOpacity>
      </View>

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        conversationId={conversationId}
        onPollCreated={handlePollCreated}
      />
    </SafeAreaView>
  );
}

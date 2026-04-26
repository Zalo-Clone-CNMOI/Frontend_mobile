import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, BarChart3, Plus, Clock, CheckCircle2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { usePollStore } from '@/src/store/usePollStore';
import { useTheme } from '@/src/theme/themeContext';
import { PollListItem, PollStatus } from '@/src/types/dto/PollDTO';
import { formatTimeAgo } from '@/src/utils/formatTimeAgo';
import { CreatePollModal } from '@/src/components/chat/CreatePollModal';

interface PollCardProps {
  poll: PollListItem;
  onVote: (pollId: string) => void;
  onViewResults: (pollId: string) => void;
}

function PollCard({ poll, onVote, onViewResults }: PollCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isClosed = poll.status === 'closed';
  const isExpired = poll.expires_at && Date.now() > poll.expires_at;

  return (
    <View style={[styles.pollCard, { backgroundColor: theme.colors.card }]}>
      {/* Header */}
      <View style={styles.pollHeader}>
        <Text style={[styles.timestamp, { color: theme.colors.icon }]}>
          {formatTimeAgo(poll.created_at)}
        </Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: isClosed ? '#FF3B3020' : isExpired ? '#FF950020' : '#34C75920' 
        }]}>
          <Text style={[styles.statusText, { 
            color: isClosed ? '#FF3B30' : isExpired ? '#FF9500' : '#34C759' 
          }]}>
            {isClosed 
              ? t('polls_screen.status_closed') 
              : isExpired 
                ? t('polls_screen.status_expired') 
                : t('polls_screen.status_active')}
          </Text>
        </View>
      </View>

      {/* Question */}
      <Text style={[styles.question, { color: theme.colors.text }]}>
        {poll.question}
      </Text>

      {/* Options Preview */}
      <View style={styles.optionsPreview}>
        {poll.options_count > 0 ? (
          <Text style={[styles.optionsText, { color: theme.colors.icon }]}>
            {t('polls_screen.options_count', { count: poll.options_count })}
          </Text>
        ) : null}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.primary + '15' }]}
        onPress={() => isClosed || isExpired ? onViewResults(poll.poll_id) : onVote(poll.poll_id)}
        activeOpacity={0.7}
      >
        <BarChart3 size={18} color={theme.colors.primary} />
        <Text style={[styles.actionText, { color: theme.colors.primary }]}>
          {isClosed || isExpired ? t('polls_screen.results_button') : t('polls_screen.vote_button')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

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

  const filteredPolls = polls.filter(p => 
    activeTab === 'active' ? p.status === 'active' : p.status === 'closed'
  );

  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    try {
      await pollsStore.fetchPolls(conversationId, { 
        status: activeTab,
        page: 1, 
        limit: 20 
      });
    } catch (error) {
      console.error('[ConversationPolls] Failed to fetch polls:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, activeTab, pollsStore]);

  useEffect(() => {
    if (conversationId) {
      fetchPolls();
    }
  }, [conversationId, activeTab]);

  const handleVote = useCallback((pollId: string) => {
    // Navigate to chat message with this poll, or show vote modal
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
    // Refresh polls list
    fetchPolls();
  }, [fetchPolls]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'active' ? theme.colors.primary : theme.colors.icon }
          ]}>
            {t('polls_screen.tab_active')}
          </Text>
          {activeTab === 'active' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'closed' && styles.activeTab]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'closed' ? theme.colors.primary : theme.colors.icon }
          ]}>
            {t('polls_screen.tab_closed')}
          </Text>
          {activeTab === 'closed' && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Poll List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredPolls.length === 0 ? (
        <ScrollView style={styles.emptyScroll} contentContainerStyle={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <BarChart3 size={80} color={theme.colors.primary + '40'} />
          </View>
          <Text style={[styles.emptyMainText, { color: theme.colors.text }]}>
            {activeTab === 'active' 
              ? t('polls_screen.create_cta') 
              : (activeTab === 'closed' ? t('polls_screen.no_closed') : t('polls_screen.no_active'))}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              style={[styles.emptyCreateButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCreateButtonText}>{t('polls_screen.create_button')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredPolls}
          keyExtractor={(item) => item.poll_id}
          renderItem={({ item }) => (
            <PollCard 
              poll={item} 
              onVote={handleVote}
              onViewResults={handleViewResults}
            />
          )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  pollCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsPreview: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  optionsText: {
    fontSize: 13,
  },
  votesText: {
    fontSize: 13,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyScroll: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyMainText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyCreateButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyCreateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

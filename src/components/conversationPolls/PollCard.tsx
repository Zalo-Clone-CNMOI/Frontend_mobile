import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PollListItem } from '@/src/types/dto/PollDTO';
import { formatTimeAgo } from '@/src/utils/formatTimeAgo';
import { styles } from './styles';

interface PollCardProps {
  poll: PollListItem;
  onVote: (pollId: string) => void;
  onViewResults: (pollId: string) => void;
  theme: any;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  onVote,
  onViewResults,
  theme,
}) => {
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
};

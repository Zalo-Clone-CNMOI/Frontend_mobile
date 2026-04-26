import { useTheme } from '@/src/theme/themeContext';
import { Check, Circle, CircleCheck } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PollMessageMetadata, PollDetail } from '@/src/types/dto/PollDTO';

type PollOption = {
  option_id: string;
  label: string;
  order_index: number;
  vote_count: number;
  added_by_user_id?: string | null;
};

interface PollVoteOptionsProps {
  poll: PollMessageMetadata | PollDetail;
  selectedOptions: string[];
  onToggleOption: (optionId: string) => void;
  disabled?: boolean;
  showResults?: boolean;
  totalVotes?: number;
  variant?: 'card' | 'detail';
}

export function PollVoteOptions({
  poll,
  selectedOptions,
  onToggleOption,
  disabled = false,
  showResults = false,
  totalVotes: propTotalVotes,
  variant = 'card',
}: PollVoteOptionsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const totalVotes = propTotalVotes ?? ('total_votes' in poll ? poll.total_votes : 0);
  const isMultiple = poll.allow_multiple;
  const isClosed = poll.status === 'closed';
  const isExpired = poll.expires_at && Date.now() > poll.expires_at;
  const isDisabled = disabled || isClosed || isExpired;

  const calculatePercentage = (voteCount: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  const getMostVotedOptionIds = (): string[] => {
    if (!showResults || totalVotes === 0) return [];
    const maxVotes = Math.max(...poll.options.map(o => o.vote_count));
    if (maxVotes === 0) return [];
    return poll.options
      .filter(o => o.vote_count === maxVotes)
      .map(o => o.option_id);
  };

  const mostVotedIds = getMostVotedOptionIds();

  return (
    <View style={styles.container}>
      {poll.options.map((option, index) => {
        const isSelected = selectedOptions.includes(option.option_id);
        const percentage = calculatePercentage(option.vote_count);
        const isMostVoted = mostVotedIds.includes(option.option_id);
        const showPercentage = showResults && totalVotes > 0;

        return (
          <Pressable
            key={option.option_id}
            onPress={() => !isDisabled && onToggleOption(option.option_id)}
            disabled={!!isDisabled}
            style={({ pressed }) => [
              styles.optionContainer,
              {
                backgroundColor: showPercentage
                  ? `${theme.colors.primary}15` // 15 = ~8% opacity
                  : isSelected
                    ? `${theme.colors.primary}20`
                    : theme.colors.card,
                borderColor: isSelected
                  ? theme.colors.primary
                  : (isMostVoted && showPercentage)
                    ? `${theme.colors.primary}50`
                    : theme.colors.border,
                opacity: isDisabled ? 0.7 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {/* Selection indicator */}
            <View style={styles.selectionContainer}>
              {isMultiple ? (
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Check size={14} color={theme.colors.background} strokeWidth={3} />
                  )}
                </View>
              ) : (
                <View style={styles.radioContainer}>
                  {isSelected ? (
                    <CircleCheck
                      size={22}
                      color={theme.colors.primary}
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      size={22}
                      color={isDisabled ? theme.colors.border : theme.colors.text}
                      strokeWidth={1.5}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Option content */}
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: theme.colors.text,
                    fontWeight: isMostVoted && showPercentage ? '600' : '400',
                  },
                ]}
                numberOfLines={2}
              >
                {option.label}
              </Text>

              {showPercentage && (
                <View style={styles.resultContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: isMostVoted
                          ? theme.colors.primary
                          : `${theme.colors.primary}60`,
                        width: `${percentage}%`,
                      },
                    ]}
                  />
                  <View style={styles.voteInfo}>
                    <Text style={[styles.percentageText, { color: theme.colors.text }]}>
                      {percentage}%
                    </Text>
                    <Text style={[styles.voteCount, { color: theme.colors.icon }]}>
                      {option.vote_count} {t('poll.votes') || 'votes'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Vote count badge in card mode */}
            {showPercentage && variant === 'card' && (
              <View style={styles.voteBadge}>
                <Text style={[styles.voteBadgeText, { color: theme.colors.primary }]}>
                  {option.vote_count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Selection mode hint */}
      {!isDisabled && (
        <Text style={[styles.hint, { color: theme.colors.icon }]}>
          {isMultiple
            ? t('poll.multiSelectHint') || 'Chọn một hoặc nhiều'
            : t('poll.singleSelectHint') || 'Chọn một đáp án'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
  },
  selectionContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  resultContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voteCount: {
    fontSize: 12,
  },
  voteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  voteBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});

export default PollVoteOptions;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View, Animated } from 'react-native';
import type { PollDetail, PollOption } from '@/src/types/dto/PollDTO';
import { styles } from './styles';

interface PollOptionsProps {
  poll: PollDetail;
  selectedOptions: string[];
  hasVoted: boolean;
  isClosed: boolean;
  isActive: boolean;
  onToggleOption: (optionId: string) => void;
  // Remove option props
  currentUserId?: string;
  onRemoveOption?: (optionId: string) => void;
  isRemovingOption?: string | null; // optionId being removed
}

interface OptionItemProps {
  option: PollOption;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  totalVotes: number;
  showResults: boolean;
  allowMultiple: boolean;
  onPress: () => void;
  // Remove option
  canRemove?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
}

/**
 * Calculate vote percentage
 */
const calculatePercentage = (voteCount: number, totalVotes: number): number => {
  if (totalVotes === 0) return 0;
  return Math.round((voteCount / totalVotes) * 100);
};

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  isSelected,
  isDisabled,
  totalVotes,
  showResults,
  allowMultiple,
  onPress,
  canRemove,
  onRemove,
  isRemoving,
}) => {
  const { t } = useTranslation();
  const percentage = calculatePercentage(option.vote_count, totalVotes);
  const isVotedByMe = isSelected;

  // Scale animation for voter avatars
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isSelected && !showResults) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [isSelected, showResults, scaleAnim]);

  return (
    <TouchableOpacity
      style={[
        styles.optionContainer,
        !showResults && isSelected && styles.optionSelected,
        showResults && styles.optionWithResult,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
    >
      <View style={styles.optionContent}>
        {/* Selection Icon - Circle for single, Square for multiple */}
        <View style={[
          styles.selectionIcon,
          allowMultiple && styles.selectionIconSquare,
          isSelected && styles.selectionIconSelected
        ]}>
          {isSelected ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : (
            <View style={styles.selectionIconInnerEmpty} />
          )}
        </View>

        {/* Option Label and Stats Row */}
        <View style={styles.optionLabelContainer}>
          <View style={styles.optionLabelRow}>
            <Text
              style={[
                styles.optionLabel,
                showResults && styles.optionLabelWithResult,
                isVotedByMe && styles.optionLabelVoted,
              ]}
              numberOfLines={2}
            >
              {option.label}
            </Text>
            
            {/* Vote Count on the right */}
            {showResults && (
              <Text style={styles.voteCountBadge}>
                {option.vote_count} {t('poll.votes')}
              </Text>
            )}
          </View>

          {/* Progress Bar with Percentage (only when showing results) */}
          {showResults && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${percentage}%` },
                    isVotedByMe && styles.progressBarVoted,
                  ]}
                />
              </View>
              <Text style={[styles.percentageBadge, isVotedByMe && styles.percentageBadgeVoted]}>
                {percentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Voter Avatars (placeholder - backend needs to provide voter data) */}
        {!showResults && option.vote_count > 0 && (
          <Animated.View style={[styles.voterAvatars, { transform: [{ scale: scaleAnim }] }]}>
            {/* TODO: Add actual voter avatars when backend provides voter data */}
            {option.vote_count > 0 && (
              <View style={[styles.avatarMore, styles.avatarFirst]}>
                <Text style={styles.avatarMoreText}>+{option.vote_count}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Remove Option Button (creator only, no votes) */}
        {canRemove && onRemove && (
          <TouchableOpacity
            style={styles.removeOptionButton}
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={isRemoving}
          >
            <Text style={styles.removeOptionText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const PollOptions: React.FC<PollOptionsProps> = ({
  poll,
  selectedOptions,
  hasVoted,
  isClosed,
  isActive,
  onToggleOption,
  currentUserId,
  onRemoveOption,
  isRemovingOption,
}) => {
  const isDisabled = !isActive;

  // Show results if: has votes OR is closed OR expired
  const showResults = poll.total_votes > 0 || isClosed;

  // Check if current user can remove an option (creator only, option has no votes)
  const canRemoveOption = (option: PollOption): boolean => {
    if (!currentUserId) return false;
    if (poll.creator_id !== currentUserId) return false;
    if (isClosed) return false;
    if (option.vote_count > 0) return false;
    return true;
  };

  return (
    <View style={styles.optionsContainer}>
      {poll.options.map((option, index) => (
        <OptionItem
          key={`${option.option_id}-${option.label}`}
          option={option}
          index={index}
          isSelected={selectedOptions.includes(option.option_id)}
          isDisabled={isDisabled}
          totalVotes={poll.total_votes}
          showResults={showResults}
          allowMultiple={poll.allow_multiple}
          onPress={() => onToggleOption(option.option_id)}
          canRemove={canRemoveOption(option)}
          onRemove={onRemoveOption ? () => onRemoveOption(option.option_id) : undefined}
          isRemoving={isRemovingOption === option.option_id}
        />
      ))}
    </View>
  );
};

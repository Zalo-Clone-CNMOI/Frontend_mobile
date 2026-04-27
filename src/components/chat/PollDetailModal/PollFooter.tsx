import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View, Animated } from 'react-native';
import { styles } from './styles';

interface PollFooterProps {
  selectedCount: number;
  onVote: () => void;
  disabled?: boolean;
  isVoting?: boolean;
}

export const PollFooter: React.FC<PollFooterProps> = ({
  selectedCount,
  onVote,
  disabled,
  isVoting = false,
}) => {
  const { t } = useTranslation();

  const canVote = !disabled;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.bottomBar}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.voteButton, !canVote && styles.voteButtonDisabled, isVoting && styles.voteButtonDisabled]}
          onPress={onVote}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!canVote || isVoting}
          activeOpacity={1}
        >
          <Text style={styles.voteButtonText}>
            {isVoting
              ? t('pollDetail.voting', 'Đang bình chọn...')
              : t('pollDetail.vote', 'Bình chọn')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

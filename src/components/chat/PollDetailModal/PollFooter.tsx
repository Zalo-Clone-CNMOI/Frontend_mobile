import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface PollFooterProps {
  selectedCount: number;
  onVote: () => void;
  disabled?: boolean;
}

export const PollFooter: React.FC<PollFooterProps> = ({
  selectedCount,
  onVote,
  disabled,
}) => {
  const { t } = useTranslation();

  const canVote = selectedCount > 0 && !disabled;

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={[styles.voteButton, !canVote && styles.voteButtonDisabled]}
        onPress={onVote}
        disabled={!canVote}
      >
        <Text style={styles.voteButtonText}>{t('pollDetail.vote')}</Text>
      </TouchableOpacity>
    </View>
  );
};

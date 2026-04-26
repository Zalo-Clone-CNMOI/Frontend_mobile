import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PollDetail, PollOption } from '@/src/types/dto/PollDTO';
import { styles } from './styles';

interface PollOptionsProps {
  poll: PollDetail;
  selectedOptions: string[];
  hasVoted: boolean;
  isClosed: boolean;
  onToggleOption: (optionId: string) => void;
}

interface OptionItemProps {
  option: PollOption;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  isSelected,
  isDisabled,
  onPress,
}) => {
  const letter = String.fromCharCode(65 + index);

  return (
    <TouchableOpacity
      key={option.option_id}
      style={[
        styles.option,
        isSelected && styles.optionSelected,
        isDisabled && styles.optionDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text
        style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
        ]}
      >
        {letter}
      </Text>
    </TouchableOpacity>
  );
};

export const PollOptions: React.FC<PollOptionsProps> = ({
  poll,
  selectedOptions,
  hasVoted,
  isClosed,
  onToggleOption,
}) => {
  const isDisabled = hasVoted || isClosed;

  return (
    <View style={styles.optionsContainer}>
      {poll.options.map((option, index) => (
        <OptionItem
          key={option.option_id}
          option={option}
          index={index}
          isSelected={selectedOptions.includes(option.option_id)}
          isDisabled={isDisabled}
          onPress={() => onToggleOption(option.option_id)}
        />
      ))}
    </View>
  );
};

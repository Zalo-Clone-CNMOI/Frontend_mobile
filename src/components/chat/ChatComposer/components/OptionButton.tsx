import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { styles } from '../styles';

interface OptionButtonProps {
  title: string;
  Icon: any;
  onPress: () => void;
  theme: any;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  title,
  Icon,
  onPress,
  theme,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Icon size={20} color={theme.colors.iconHeader} />
      </View>
      <Text style={[styles.optionText, { color: theme.colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

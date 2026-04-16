import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getAvatarColor, getInitials } from '../../utils/avatarUtils';

interface AvatarWithInitialsProps {
  name: string;
  size?: number;
  style?: any;
}

export const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({
  name,
  size = 55,
  style,
}) => {
  const initials = getInitials(name, 2);
  const backgroundColor = getAvatarColor(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: size * 0.4,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

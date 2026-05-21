import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { PhoneOff } from 'lucide-react-native';

interface EndCallButtonProps {
  onPress: () => void;
  size?: number;
}

export function EndCallButton({ onPress, size = 68 }: EndCallButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrap}>
      <View style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}>
        <PhoneOff size={size * 0.45} color="white" />
      </View>
      <Text style={styles.label}>Kết thúc</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
});

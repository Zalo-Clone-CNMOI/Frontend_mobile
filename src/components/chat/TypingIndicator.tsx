import { useTheme } from '@/src/theme/themeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function TypingIndicator() {
  const theme = useTheme();
  
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3]);

  const translateY = (dot: Animated.Value) =>
    dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -5],
    });

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.colors.card }]}>
        <Animated.View style={[styles.dot, { backgroundColor: theme.colors.text, transform: [{ translateY: translateY(dot1) }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.colors.text, transform: [{ translateY: translateY(dot2) }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.colors.text, transform: [{ translateY: translateY(dot3) }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
});

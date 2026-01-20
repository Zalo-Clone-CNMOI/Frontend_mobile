import React from 'react';
import { StyleSheet, View } from 'react-native';

interface GestureWrapperProps {
  children: React.ReactNode;
}

export function GestureWrapper({ children }: GestureWrapperProps) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

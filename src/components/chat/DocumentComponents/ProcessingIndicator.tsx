import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react-native';

interface ProcessingIndicatorProps {
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  fileName?: string;
  progress?: number;
  errorMessage?: string;
}

export function ProcessingIndicator({
  status,
  fileName,
  progress = 0,
  errorMessage,
}: ProcessingIndicatorProps) {
  const theme = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'uploading' || status === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedWidth, {
            toValue: 100,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedWidth, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={16} color={theme.colors.primary} />;
      case 'processing':
        return <Loader2 size={16} color={theme.colors.primary} />;
      case 'completed':
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'failed':
        return <XCircle size={16} color={theme.colors.error} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing chunks...';
      case 'completed':
        return 'Ready';
      case 'failed':
        return errorMessage || 'Failed';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return theme.colors.primary;
      case 'processing':
        return theme.colors.warning;
      case 'completed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
    }
  };

  if (status === 'completed' || status === 'failed') {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {getStatusIcon()}
          <View style={styles.textContainer}>
            {fileName && (
              <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                {fileName}
              </Text>
            )}
            <Text style={[styles.statusText, { color: theme.colors.icon }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {getStatusIcon()}
        <View style={styles.textContainer}>
          {fileName && (
            <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
              {fileName}
            </Text>
          )}
          <Text style={[styles.statusText, { color: theme.colors.icon }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.primary + '20' }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: getProgressColor(),
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 11,
    marginTop: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
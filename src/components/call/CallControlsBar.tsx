import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  RefreshCw,
  Users,
  ChevronDown,
} from 'lucide-react-native';

interface CallControl {
  key: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
  destructive?: boolean;
}

interface CallControlsBarProps {
  controls: CallControl[];
  onMinimize?: () => void;
  visible: boolean;
  onToggleVisibility?: () => void;
}

const CONTROL_SIZE = 52;
const ICON_SIZE = 22;

function ControlButton({
  icon,
  activeIcon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.controlWrap}
    >
      <View
        style={[
          styles.controlCircle,
          active && styles.controlActive,
        ]}
      >
        {active && activeIcon ? activeIcon : icon}
      </View>
      <Text style={styles.controlLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CallControlsBar({
  controls,
  onMinimize,
  visible,
}: CallControlsBarProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible && Animated.Value) {
    // still render but invisible for layout
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {onMinimize && (
        <TouchableOpacity
          onPress={onMinimize}
          style={styles.minimizeBtn}
          activeOpacity={0.7}
        >
          <ChevronDown size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      )}

      <View style={styles.controlsRow}>
        {controls.slice(0, 4).map((ctrl) => (
          <ControlButton
            key={ctrl.key}
            icon={ctrl.icon}
            activeIcon={ctrl.activeIcon}
            label={ctrl.label}
            active={ctrl.active}
            onPress={ctrl.onPress}
          />
        ))}
      </View>
      <View style={styles.controlsRow}>
        {controls.slice(4).map((ctrl) => (
          <ControlButton
            key={ctrl.key}
            icon={ctrl.icon}
            activeIcon={ctrl.activeIcon}
            label={ctrl.label}
            active={ctrl.active}
            onPress={ctrl.onPress}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  minimizeBtn: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  controlWrap: {
    alignItems: 'center',
    minWidth: 56,
  },
  controlCircle: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  controlActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
});

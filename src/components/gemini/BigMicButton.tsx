import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Icon } from '@/design-system/icons';
import { useAppLanguage } from '@/services/i18n/i18n';

interface BigMicButtonProps {
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
  color: string;
  reduceMotion?: boolean;
}

export function BigMicButton({ isActive, disabled, onPress, color, reduceMotion = false }: BigMicButtonProps) {
  const { t } = useAppLanguage();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && !reduceMotion) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isActive, pulse, reduceMotion]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      {isActive && (
        <Animated.View
          style={[
            styles.ring,
            { borderColor: color + '40', transform: [{ scale: pulse }] },
          ]}
        />
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t(isActive ? 'Stop microphone' : 'Start microphone')}
        accessibilityState={{ disabled, selected: isActive }}
        style={[
          styles.button,
          {
            backgroundColor: isActive ? '#FF4444' : disabled ? color + '40' : color,
            shadowColor: isActive ? '#FF4444' : color,
          },
        ]}
      >
        <Icon
          name={isActive ? 'Square' : 'Mic'}
          size={40}
          color="#FFFFFF"
          accessibilityLabel={t(isActive ? 'Stop microphone' : 'Start microphone')}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    top: -10,
    left: -10,
  },
});

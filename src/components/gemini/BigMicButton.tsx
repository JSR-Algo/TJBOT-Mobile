import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';

interface BigMicButtonProps {
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
  color: string;
}

export function BigMicButton({ isActive, disabled, onPress, color }: BigMicButtonProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
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
  }, [isActive, pulse]);

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
        style={[
          styles.button,
          {
            backgroundColor: isActive ? '#FF4444' : disabled ? color + '40' : color,
            shadowColor: isActive ? '#FF4444' : color,
          },
        ]}
      >
        <Text style={styles.icon}>{isActive ? '\u23F9' : '\uD83C\uDF99'}</Text>
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
  icon: { fontSize: 40 },
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

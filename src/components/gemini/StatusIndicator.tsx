import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import type { VoiceState } from '../../state/voiceAssistantStore';

const STATUS_MAP: Record<VoiceState, { label: string; color: string; pulse: boolean }> = {
  IDLE:                       { label: 'S\u1EB5n s\u00E0ng tr\u00F2 chuy\u1EC7n',  color: '#A0A0A0', pulse: false },
  REQUESTING_MIC_PERMISSION:  { label: 'Xin quy\u1EC1n micro...',  color: '#FFB74D', pulse: true },
  CONNECTING:                 { label: '\u0110ang k\u1EBFt n\u1ED1i...',     color: '#FFB74D', pulse: true },
  LISTENING:                  { label: '\u0110ang ch\u1EDD...',          color: '#4CAF50', pulse: true },
  STREAMING_INPUT:            { label: '\u0110ang nghe...',         color: '#4CAF50', pulse: true },
  WAITING_AI:                 { label: '\u0110ang ngh\u0129...',          color: '#42A5F5', pulse: true },
  PLAYING_AI_AUDIO:           { label: '\u0110ang tr\u1EA3 l\u1EDDi...',     color: '#A29BFE', pulse: true },
  INTERRUPTED:                { label: '\u0110\u00E3 ng\u1EAFt',             color: '#FF7043', pulse: false },
  RECONNECTING:               { label: '\u0110ang k\u1EBFt n\u1ED1i l\u1EA1i...', color: '#FFB74D', pulse: true },
  ERROR:                      { label: 'L\u1ED7i k\u1EBFt n\u1ED1i',         color: '#FF4444', pulse: false },
};

export function StatusIndicator({ state }: { state: VoiceState }) {
  const { label, color, pulse: shouldPulse } = STATUS_MAP[state];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shouldPulse) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [shouldPulse, pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: pulseAnim }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

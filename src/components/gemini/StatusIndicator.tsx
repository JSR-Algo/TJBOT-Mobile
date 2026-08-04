import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import type { VoiceState } from '../../state/voiceAssistantStore';
import { useAppLanguage } from '@/services/i18n/i18n';

const STATUS_MAP: Record<VoiceState, { label: string; color: string; pulse: boolean }> = {
  IDLE:                       { label: 'Ready to talk',                  color: '#A0A0A0', pulse: false },
  PREPARING_AUDIO:            { label: 'Requesting microphone access...', color: '#FFB74D', pulse: true },
  CONNECTING:                 { label: 'Connecting...',                  color: '#FFB74D', pulse: true },
  READY:                      { label: 'Getting ready...',               color: '#FFB74D', pulse: true },
  LISTENING:                  { label: 'Waiting...',                     color: '#4CAF50', pulse: true },
  USER_SPEAKING:              { label: 'Listening for your voice...',    color: '#4CAF50', pulse: true },
  USER_SPEECH_FINALIZING:     { label: 'Thinking...',                    color: '#42A5F5', pulse: true },
  WAITING_AI:                 { label: 'Thinking...',                    color: '#42A5F5', pulse: true },
  ASSISTANT_SPEAKING:         { label: 'Responding...',                  color: '#A29BFE', pulse: true },
  INTERRUPTED:                { label: 'Interrupted',                    color: '#FF7043', pulse: false },
  RECONNECTING:               { label: 'Reconnecting...',                color: '#FFB74D', pulse: true },
  ERROR_RECOVERABLE:          { label: 'Connection error',               color: '#FF4444', pulse: false },
  ERROR_FATAL:                { label: 'Critical error',                 color: '#B71C1C', pulse: false },
  ENDED:                      { label: 'Ended',                          color: '#A0A0A0', pulse: false },
};

export function StatusIndicator({ state }: { state: VoiceState }) {
  const { t } = useAppLanguage();
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
      <Text style={[styles.text, { color }]}>{t(label)}</Text>
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

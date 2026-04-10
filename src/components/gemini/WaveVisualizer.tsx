import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const BAR_COUNT = 16;
const CENTER = (BAR_COUNT - 1) / 2;

/**
 * Audio wave visualizer that responds to REAL volume only.
 * When audioLevel=0 (silent), bars stay flat.
 * When audioLevel>0 (speaking), bars animate proportionally.
 * Center bars are taller, edges taper off u2014 organic wave shape.
 */
export function WaveVisualizer({ audioLevel, color, isAiSpeaking }: {
  audioLevel: number;
  color: string;
  isAiSpeaking?: boolean;
}) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.05)),
  ).current;

  useEffect(() => {
    // Silent: all bars go flat
    if (audioLevel < 0.01 && !isAiSpeaking) {
      bars.forEach((bar) => {
        Animated.timing(bar, { toValue: 0.05, duration: 150, useNativeDriver: true }).start();
      });
      return;
    }

    const level = isAiSpeaking ? 0.5 + Math.random() * 0.3 : audioLevel;

    bars.forEach((bar, i) => {
      // Bell curve: center bars taller, edges shorter
      const distFromCenter = Math.abs(i - CENTER) / CENTER;
      const bellCurve = Math.exp(-2 * distFromCenter * distFromCenter);
      // Add randomness for organic feel
      const jitter = 0.8 + Math.random() * 0.4;
      const target = Math.max(0.05, Math.min(1, level * bellCurve * jitter * 1.8));

      Animated.timing(bar, {
        toValue: target,
        duration: 60 + Math.random() * 40, // Slight variation in timing
        useNativeDriver: true,
      }).start();
    });
  }, [audioLevel, isAiSpeaking, bars]);

  return (
    <View style={styles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: isAiSpeaking ? '#A29BFE' : color,
              opacity: isAiSpeaking ? 0.8 : 1,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 3,
    paddingHorizontal: 30,
  },
  bar: {
    width: 3.5,
    height: 48,
    borderRadius: 2,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

const BAR_COUNT = 16;
const CENTER = (BAR_COUNT - 1) / 2;

export function WaveVisualizer({
  audioLevel,
  color,
  isAiSpeaking,
  reduceMotion = false,
}: {
  audioLevel: number;
  color: string;
  isAiSpeaking?: boolean;
  reduceMotion?: boolean;
}) {
  const { language } = useAppLanguage();
  const level = reduceMotion ? 0.05 : isAiSpeaking ? 0.72 : Math.max(0.05, audioLevel);

  return (
    <View style={styles.container} accessibilityLabel={translateCopy('Voice activity waveform', { locale: language })}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const distFromCenter = Math.abs(i - CENTER) / CENTER;
        const bellCurve = Math.exp(-2 * distFromCenter * distFromCenter);
        const scaleY = Math.max(0.05, Math.min(1, level * bellCurve * 1.8));
        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                backgroundColor: isAiSpeaking ? '#A29BFE' : color,
                opacity: isAiSpeaking ? 0.8 : 1,
                transform: [{ scaleY }],
              },
            ]}
          />
        );
      })}
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

import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  GREET_FRAMES,
  GREET_FRAME_COUNT,
  GREET_LOOP_MS,
} from '@/assets/mascot/greet-frames';

const ALIVE_WAVE = require('@/assets/mascot/alive-wave.png') as ImageSourcePropType;
const FRAME_WIDTH = 275;
const FRAME_HEIGHT = 363;
const FRAME_MS = Math.max(80, Math.round(GREET_LOOP_MS / GREET_FRAME_COUNT));

export type RobotGreetLoopProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  reduceMotion?: boolean;
};

/**
 * Transparent 77-frame greet loop from the legacy robot reference.
 * The legacy stage, border, and debug badge are intentionally not included.
 */
export default function RobotGreetLoop({
  size = 340,
  style,
  accessibilityLabel = 'TeeBot robot greeting animation',
  testID = 'robotGreetLoop',
  reduceMotion = false,
}: RobotGreetLoopProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const frameWidth = size * (FRAME_WIDTH / FRAME_HEIGHT);

  useEffect(() => {
    if (reduceMotion || GREET_FRAMES.length < 2) return undefined;
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % GREET_FRAMES.length;
      setIndex(indexRef.current);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.root, { width: frameWidth, height: size }, style]}
    >
      <Image
        source={reduceMotion ? ALIVE_WAVE : (GREET_FRAMES[index] ?? ALIVE_WAVE)}
        style={{ width: frameWidth, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

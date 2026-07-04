import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClayScreenFace } from '@/character/ClayFacePieces';
import { resolveClayExpression } from '@/character/expressions';
import { tokens } from '@/design-system/tokens';

export interface ClayRobotScreenProps {
  /** Mood key: RobotReadyState, LCDFace emotion, or sprite pose id. */
  mood?: string;
  size?: number;
  accent?: string;
  isSpeaking?: boolean;
  showChestGlow?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Cream clay TeeBot head with coral ears and a black LCD screen that renders
 * procedural eyes and mouth pieces for the current mood.
 */
export default function ClayRobotScreen({
  mood = 'idle',
  size = 180,
  accent = tokens.colors.coral,
  isSpeaking = false,
  showChestGlow = true,
  testID = 'clay-robot-screen',
  accessibilityLabel = 'TeeBot robot',
}: ClayRobotScreenProps): React.JSX.Element {
  const expression = useMemo(() => resolveClayExpression(mood, isSpeaking), [mood, isSpeaking]);

  const headW = size * 0.88;
  const headH = size * 0.92;
  const screenW = headW * 0.62;
  const screenH = headH * 0.38;
  const earW = size * 0.16;
  const earH = size * 0.2;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.root, { width: size, height: size * 1.02 }]}
    >
      <View
        style={[
          styles.head,
          {
            width: headW,
            height: headH,
            borderRadius: headW * 0.42,
            backgroundColor: tokens.colors.bot.body,
          },
        ]}
      >
        <View
          style={[
            styles.ear,
            {
              width: earW,
              height: earH,
              borderRadius: earW * 0.5,
              backgroundColor: accent,
              left: -earW * 0.55,
            },
          ]}
        />
        <View
          style={[
            styles.ear,
            {
              width: earW,
              height: earH,
              borderRadius: earW * 0.5,
              backgroundColor: accent,
              right: -earW * 0.55,
            },
          ]}
        />

        <View
          testID={`${testID}-lcd`}
          style={[
            styles.screenBezel,
            {
              width: screenW + 6,
              height: screenH + 6,
              borderRadius: screenH * 0.28,
            },
          ]}
        >
          <ClayScreenFace
            expression={expression}
            width={screenW}
            height={screenH}
          />
        </View>

        {showChestGlow ? (
          <View
            testID={`${testID}-chest-glow`}
            style={[
              styles.chestGlow,
              {
                width: size * 0.12,
                height: size * 0.12,
                borderRadius: size * 0.06,
                bottom: headH * 0.08,
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.card,
  },
  ear: {
    position: 'absolute',
    top: '38%',
  },
  screenBezel: {
    backgroundColor: '#DDE7EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chestGlow: {
    position: 'absolute',
    backgroundColor: '#28F4F4',
    borderWidth: 2,
    borderColor: '#B8FFFF',
  },
});
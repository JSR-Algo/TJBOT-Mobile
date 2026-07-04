import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { RobotState, ModeTheme } from './RobotModeTheme';

interface RobotFaceProps {
  robotState: RobotState;
  theme: ModeTheme;
  size?: number;
  audioLevel?: number;
  reduceMotion?: boolean;
}

function getStateColor(state: RobotState, theme: ModeTheme): string {
  switch (state) {
    case 'listening':
    case 'recording':
      return '#00E5FF';
    case 'processing_stt':
    case 'processing_llm':
    case 'processing_tts':
      return '#FFD700';
    case 'speaking':
      return theme.accent;
    case 'error':
      return '#FF4444';
    case 'low_battery':
      return '#FF6D00';
    case 'charging':
      return '#69FF47';
    case 'offline':
    case 'no_speech':
      return '#546E7A';
    default:
      return theme.primary;
  }
}

function AudioLevelBars({ size, color, audioLevel }: { size: number; color: string; audioLevel: number }) {
  const bars = 7;
  const maxH = size * 0.12;
  const barW = size * 0.022;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.01, marginTop: size * 0.06 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const center = (bars - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const targetH = maxH * (0.25 + audioLevel * (1 - dist * 0.3));
        return (
          <Animated.View
            key={i}
            style={{
              width: barW,
              height: targetH,
              borderRadius: barW / 2,
              backgroundColor: color,
              opacity: 0.85 + audioLevel * 0.15,
            }}
          />
        );
      })}
    </View>
  );
}

function Eye({ size, color, state }: { size: number; color: string; state: RobotState }) {
  const eyeSize = size * 0.155;
  if (state === 'error') {
    return (
      <View style={{ width: eyeSize, height: eyeSize, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.errorEye, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.errorEye, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        width: eyeSize,
        height: eyeSize,
        borderRadius: eyeSize / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.95,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <View style={{
        width: eyeSize * 0.28,
        height: eyeSize * 0.28,
        borderRadius: eyeSize * 0.14,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginTop: eyeSize * 0.1,
      }} />
    </Animated.View>
  );
}

export function RobotFace({ robotState, theme, size = 220, audioLevel = 0, reduceMotion = false }: RobotFaceProps): React.JSX.Element {
  const stateColor = getStateColor(robotState, theme);
  const frameOuter = size * 1.08;
  const frameMid = size * 1.02;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: size * 1.4, height: size * 1.4, transform: [{ scale: reduceMotion ? 1 : 1.01 }] },
      ]}
    >
      <Animated.View
        style={[
          styles.absoluteCenter,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size * 0.675,
            backgroundColor: `${stateColor}18`,
            opacity: robotState === 'speaking' || robotState === 'listening' ? 0.7 : 0.25,
          },
        ]}
      />

      <View style={[styles.absoluteCenter, {
        width: frameOuter,
        height: frameOuter,
        borderRadius: frameOuter / 2,
        borderWidth: 3,
        borderColor: `${stateColor}55`,
      }]} />

      <View style={[styles.absoluteCenter, {
        width: frameMid,
        height: frameMid,
        borderRadius: frameMid / 2,
        borderWidth: 1,
        borderColor: `${stateColor}30`,
      }]} />

      <View
        style={[
          styles.absoluteCenter,
          styles.head,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: theme.bg,
            borderColor: stateColor,
            borderWidth: 2,
            shadowColor: stateColor,
            shadowOpacity: 0.4,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <View
          style={{
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size * 0.18,
            backgroundColor: `${stateColor}08`,
            borderWidth: 1,
            borderColor: `${stateColor}20`,
            alignItems: 'center',
            paddingTop: size * 0.12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: size * 0.18 }}>
            <Eye size={size} color={stateColor} state={robotState} />
            <Eye size={size} color={stateColor} state={robotState} />
          </View>
          <View style={{ marginTop: size * 0.08, alignItems: 'center' }}>
            {robotState === 'speaking' || robotState === 'listening' ? (
              <AudioLevelBars size={size} color={stateColor} audioLevel={audioLevel} />
            ) : (
              <View
                style={{
                  width: size * (robotState === 'error' ? 0.25 : 0.38),
                  height: size * 0.055,
                  borderRadius: size * 0.028,
                  backgroundColor: stateColor,
                  opacity: robotState === 'offline' ? 0.3 : 0.8,
                  marginTop: size * 0.08,
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteCenter: {
    position: 'absolute',
    alignSelf: 'center',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  errorEye: {
    position: 'absolute',
    width: 3,
    height: 22,
    borderRadius: 2,
  },
});

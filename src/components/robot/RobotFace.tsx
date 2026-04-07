import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { RobotState } from '../../screens/interaction/RobotStateMachine';
import { ModeTheme } from './RobotModeTheme';
import {
  useBreathingAnimation,
  useMicPulseAnimation,
  useThinkingAnimation,
  useShakeAnimation,
  useGlowAnimation,
  useBlinkAnimation,
} from './RobotAnimations';

interface RobotFaceProps {
  robotState: RobotState;
  theme: ModeTheme;
  size?: number;
  audioLevel?: number; // 0–1, live audio amplitude for waveform
}

// ─── State color palette ───────────────────────────────────────────────────
function getStateColor(state: RobotState, theme: ModeTheme): string {
  switch (state) {
    case 'listening': return '#00E5FF';
    case 'thinking':  return '#FFD700';
    case 'speaking':  return theme.accent;
    case 'error':     return '#FF4444';
    case 'low_battery': return '#FF6D00';
    case 'charging':  return '#69FF47';
    case 'offline':   return '#546E7A';
    default:          return theme.primary;
  }
}

// ─── LED Ring segments around the head ────────────────────────────────────
function LEDRing({ size, color, state }: { size: number; color: string; state: RobotState }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const active = state === 'listening' || state === 'speaking' || state === 'thinking';
    if (!active) {
      Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }).start();
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [state, opacity]);

  const segments = 12;
  const radius = size * 0.56;
  const dotSize = size * 0.04;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle) - dotSize / 2;
        const y = size / 2 + radius * Math.sin(angle) - dotSize / 2;
        // Alternate brightness for effect
        const dotOpacity = i % 3 === 0 ? 1 : 0.5;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              opacity: dotOpacity,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

// ─── Audio level bars (listening) ─────────────────────────────────────────
function AudioLevelBars({ size, color, audioLevel }: { size: number; color: string; audioLevel: number }) {
  const bars = 7;
  const maxH = size * 0.12;
  const barW = size * 0.022;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.01, marginTop: size * 0.06 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const center = (bars - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const baseH = (1 - dist * 0.4) * maxH * 0.3;
        const targetH = baseH + audioLevel * maxH * (1 - dist * 0.3);
        return (
          <View
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

// ─── Speaking waveform ────────────────────────────────────────────────────
function SpeakingWaveform({ size, color, audioLevel }: { size: number; color: string; audioLevel: number }) {
  const bars = 7;
  const anims = useRef(
    Array.from({ length: bars }, (_, i) => {
      const center = (bars - 1) / 2;
      const dist = Math.abs(i - center) / center;
      return new Animated.Value(0.3 + (1 - dist) * 0.4);
    })
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const center = (bars - 1) / 2;
      const dist = Math.abs(i - center) / center;
      const minV = 0.2 + (1 - dist) * 0.2;
      const maxV = 0.6 + (1 - dist) * 0.4 + audioLevel * 0.4;
      const dur = 150 + i * 30;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: maxV, duration: dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: minV, duration: dur, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioLevel]);

  const maxH = size * 0.13;
  const barW = size * 0.022;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.01, marginTop: size * 0.05 }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: barW,
            height: maxH,
            borderRadius: barW / 2,
            backgroundColor: color,
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Thinking dots ────────────────────────────────────────────────────────
function ThinkingDots({ size, color }: { size: number; color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 280, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotSize = size * 0.055;

  return (
    <View style={{ flexDirection: 'row', gap: size * 0.04, marginTop: size * 0.1 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Eye component ────────────────────────────────────────────────────────
function Eye({
  size,
  color,
  state,
  eyeOpacity,
}: {
  size: number;
  color: string;
  state: RobotState;
  eyeOpacity: Animated.Value;
}) {
  const eyeSize = size * 0.155;

  if (state === 'error') {
    // X eyes for error
    return (
      <View style={{ width: eyeSize, height: eyeSize, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: eyeSize * 0.85, height: eyeSize * 0.15,
          backgroundColor: color, borderRadius: 3,
          transform: [{ rotate: '45deg' }], position: 'absolute',
        }} />
        <View style={{
          width: eyeSize * 0.85, height: eyeSize * 0.15,
          backgroundColor: color, borderRadius: 3,
          transform: [{ rotate: '-45deg' }], position: 'absolute',
        }} />
      </View>
    );
  }

  if (state === 'thinking') {
    // Scanning eye — squinted rectangle
    return (
      <Animated.View
        style={{
          width: eyeSize,
          height: eyeSize * 0.45,
          borderRadius: 4,
          backgroundColor: color,
          opacity: eyeOpacity,
          shadowColor: color,
          shadowOpacity: 0.8,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    );
  }

  if (state === 'speaking') {
    // Happy arc eyes
    return (
      <View style={{ width: eyeSize, height: eyeSize * 0.6, overflow: 'hidden' }}>
        <View style={{
          width: eyeSize,
          height: eyeSize,
          borderRadius: eyeSize / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }} />
      </View>
    );
  }

  // Default: LED circle eye with highlight
  return (
    <Animated.View
      style={{
        width: eyeSize,
        height: eyeSize,
        borderRadius: eyeSize / 2,
        backgroundColor: color,
        opacity: eyeOpacity,
        shadowColor: color,
        shadowOpacity: 0.95,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      {/* Highlight dot */}
      <View style={{
        width: eyeSize * 0.28,
        height: eyeSize * 0.28,
        borderRadius: eyeSize * 0.14,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginTop: eyeSize * 0.1,
        marginLeft: eyeSize * 0.12,
      }} />
    </Animated.View>
  );
}

// ─── Main RobotFace component ─────────────────────────────────────────────
export function RobotFace({ robotState, theme, size = 220, audioLevel = 0 }: RobotFaceProps): React.JSX.Element {
  const breathingScale = useBreathingAnimation();
  const { ringScale, ringOpacity } = useMicPulseAnimation(robotState === 'listening');
  const thinkingRotate = useThinkingAnimation();
  const { translateX, shake } = useShakeAnimation();
  const glowOpacity = useGlowAnimation(robotState === 'speaking' || robotState === 'listening');
  const eyeOpacity = useBlinkAnimation();

  // Shake on error entry
  const prevStateRef = useRef<RobotState>(robotState);
  useEffect(() => {
    if (robotState === 'error' && prevStateRef.current !== 'error') shake();
    prevStateRef.current = robotState;
  }, [robotState, shake]);

  const stateColor = getStateColor(robotState, theme);

  // Frame layers for hardware feel
  const frameOuter = size * 1.08;
  const frameMid = size * 1.02;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: size * 1.4, height: size * 1.4, transform: [{ scale: breathingScale }, { translateX }] },
      ]}
    >
      {/* ── Ambient outer glow ── */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size * 0.675,
            backgroundColor: stateColor + '18',
            opacity: glowOpacity,
          },
        ]}
      />

      {/* ── Pulse ring (listening) ── */}
      {robotState === 'listening' && (
        <Animated.View
          style={[
            styles.absoluteCenter,
            {
              width: size * 1.15,
              height: size * 1.15,
              borderRadius: size * 0.575,
              borderWidth: 1.5,
              borderColor: stateColor,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      )}

      {/* ── Hardware frame outer ring ── */}
      <View
        style={[
          styles.absoluteCenter,
          {
            width: frameOuter,
            height: frameOuter,
            borderRadius: frameOuter / 2,
            borderWidth: 3,
            borderColor: stateColor + '55',
            backgroundColor: 'transparent',
          },
        ]}
      />

      {/* ── Hardware frame mid ring ── */}
      <View
        style={[
          styles.absoluteCenter,
          {
            width: frameMid,
            height: frameMid,
            borderRadius: frameMid / 2,
            borderWidth: 1,
            borderColor: stateColor + '30',
            backgroundColor: 'transparent',
          },
        ]}
      />

      {/* ── LED dot ring ── */}
      <View style={[styles.absoluteCenter, { width: size, height: size }]}>
        <LEDRing size={size} color={stateColor} state={robotState} />
      </View>

      {/* ── Robot head / face plate ── */}
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
        {/* Inner face panel */}
        <View
          style={{
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size * 0.18,
            backgroundColor: stateColor + '08',
            borderWidth: 1,
            borderColor: stateColor + '20',
            alignItems: 'center',
            paddingTop: size * 0.12,
          }}
        >
          {/* ── Eyes ── */}
          <View style={{ flexDirection: 'row', gap: size * 0.18 }}>
            <Eye size={size} color={stateColor} state={robotState} eyeOpacity={eyeOpacity} />
            <Eye size={size} color={stateColor} state={robotState} eyeOpacity={eyeOpacity} />
          </View>

          {/* ── Thinking spinner overlay ── */}
          {robotState === 'thinking' && (
            <Animated.View
              style={[
                styles.thinkingRing,
                {
                  width: size * 0.55,
                  height: size * 0.55,
                  borderRadius: size * 0.275,
                  borderColor: stateColor,
                  transform: [{ rotate: thinkingRotate }],
                  position: 'absolute',
                  top: size * 0.04,
                },
              ]}
            />
          )}

          {/* ── Mouth / status area ── */}
          <View style={{ marginTop: size * 0.08, alignItems: 'center' }}>
            {robotState === 'speaking' ? (
              <SpeakingWaveform size={size} color={stateColor} audioLevel={audioLevel} />
            ) : robotState === 'thinking' ? (
              <ThinkingDots size={size} color={stateColor} />
            ) : robotState === 'listening' ? (
              <AudioLevelBars size={size} color={stateColor} audioLevel={audioLevel} />
            ) : (
              // Default mouth bar
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

          {/* ── Corner accent screws (hardware detail) ── */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
            <View
              key={pos}
              style={{
                position: 'absolute',
                width: size * 0.045,
                height: size * 0.045,
                borderRadius: size * 0.022,
                backgroundColor: stateColor + '40',
                borderWidth: 1,
                borderColor: stateColor + '60',
                top: pos.startsWith('t') ? size * 0.04 : undefined,
                bottom: pos.startsWith('b') ? size * 0.04 : undefined,
                left: pos.endsWith('l') ? size * 0.04 : undefined,
                right: pos.endsWith('r') ? size * 0.04 : undefined,
              }}
            />
          ))}
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
  thinkingRing: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

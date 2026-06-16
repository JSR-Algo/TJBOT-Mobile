import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { tokens } from '@/design-system/tokens';
import { Text } from '@/design-system/primitives/Text';

export const ROBOT_EMOTES = [
  'idle', 'happy', 'greet', 'listen', 'think', 'speak',
  'success', 'gentle', 'curious', 'sleep', 'sad', 'worry',
] as const;

type RobotEmotion = typeof ROBOT_EMOTES[number];

interface RobotConfig {
  bodyAnim: 'bob' | 'bobStrong' | 'tilt' | 'think' | 'none';
  bobDuration?: number;
  mouth: 'smile-soft' | 'smile' | 'open-smile' | 'tiny' | 'talk' | 'big-smile' | 'tiny-o' | 'frown-soft' | 'flat';
  eyes: 'open' | 'up' | 'happy' | 'gentle' | 'curious' | 'closed';
  cheek: boolean;
  antennaAnim: boolean;
  antennaDuration?: number;
  glow: 'on' | 'soft' | 'off';
  wave?: boolean;
  dots?: boolean;
  sparks?: boolean;
  zzz?: boolean;
  ear?: boolean;
}

const CONFIGS: Record<RobotEmotion, RobotConfig> = {
  idle:    { bodyAnim: 'bob',       bobDuration: 3600, mouth: 'smile-soft', eyes: 'open',    cheek: true,  antennaAnim: false,                           glow: 'soft' },
  happy:   { bodyAnim: 'bob',       bobDuration: 2400, mouth: 'smile',      eyes: 'open',    cheek: true,  antennaAnim: true,  antennaDuration: 2000,    glow: 'soft' },
  greet:   { bodyAnim: 'bobStrong',                    mouth: 'open-smile', eyes: 'open',    cheek: true,  antennaAnim: true,  antennaDuration: 1400,    glow: 'on',   wave: true },
  listen:  { bodyAnim: 'tilt',                         mouth: 'tiny',       eyes: 'open',    cheek: false, antennaAnim: true,  antennaDuration: 1800,    glow: 'on',   ear: true },
  think:   { bodyAnim: 'think',                        mouth: 'tiny',       eyes: 'up',      cheek: false, antennaAnim: false,                           glow: 'on',   dots: true },
  speak:   { bodyAnim: 'bob',       bobDuration: 2000, mouth: 'talk',       eyes: 'open',    cheek: true,  antennaAnim: true,  antennaDuration: 1600,    glow: 'on' },
  success: { bodyAnim: 'bobStrong',                    mouth: 'big-smile',  eyes: 'happy',   cheek: true,  antennaAnim: true,  antennaDuration: 800,     glow: 'on',   sparks: true },
  gentle:  { bodyAnim: 'bob',       bobDuration: 3000, mouth: 'smile-soft', eyes: 'gentle',  cheek: true,  antennaAnim: false,                           glow: 'soft' },
  curious: { bodyAnim: 'tilt',                         mouth: 'tiny-o',     eyes: 'curious', cheek: true,  antennaAnim: true,  antennaDuration: 2000,    glow: 'soft' },
  sleep:   { bodyAnim: 'bob',       bobDuration: 5000, mouth: 'smile-soft', eyes: 'closed',  cheek: false, antennaAnim: false,                           glow: 'off',  zzz: true },
  sad:     { bodyAnim: 'none',                         mouth: 'frown-soft', eyes: 'gentle',  cheek: false, antennaAnim: false,                           glow: 'off' },
  worry:   { bodyAnim: 'tilt',                         mouth: 'flat',       eyes: 'gentle',  cheek: false, antennaAnim: false,                           glow: 'soft' },
};

interface RobotProps {
  emotion?: RobotEmotion;
  size?: number;
  color?: string;
  accent?: string;
  accessibilityLabel?: string;
}

export default function Robot({ emotion = 'idle', size = 220, color, accent, accessibilityLabel }: RobotProps) {
  const cfg = CONFIGS[emotion] ?? CONFIGS.idle;
  const W = size;
  const bodyColor = color ?? tokens.colors.bot.body;
  const bodyDark = tokens.colors.bot.body2;
  const accentColor = accent ?? tokens.colors.coral;

  // Body animation
  const bodyY = useSharedValue(0);
  const bodyRotate = useSharedValue(0);
  const antennaRotate = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(cfg.glow === 'on' ? 0.45 : 0.25);

  useEffect(() => {
    const cfg = CONFIGS[emotion];
    const easeIO = Easing.inOut(Easing.ease);

    bodyY.value = 0;
    bodyRotate.value = 0;
    antennaRotate.value = 0;
    glowScale.value = 1;
    glowOpacity.value = cfg.glow === 'off' ? 0 : 0.3;

    if (cfg.bodyAnim === 'bob') {
      bodyY.value = withRepeat(withSequence(
        withTiming(-3, { duration: cfg.bobDuration ?? 2000, easing: easeIO }),
        withTiming(0, { duration: cfg.bobDuration ?? 2000, easing: easeIO }),
      ), -1, false);
    } else if (cfg.bodyAnim === 'bobStrong') {
      bodyY.value = withRepeat(withSequence(
        withTiming(-6, { duration: cfg.bobDuration ?? 1600, easing: easeIO }),
        withTiming(0, { duration: cfg.bobDuration ?? 1600, easing: easeIO }),
      ), -1, false);
    } else if (cfg.bodyAnim === 'tilt') {
      bodyRotate.value = withRepeat(withSequence(
        withTiming(-2, { duration: 1500, easing: easeIO }),
        withTiming(2, { duration: 1500, easing: easeIO }),
      ), -1, false);
    } else if (cfg.bodyAnim === 'think') {
      bodyRotate.value = withRepeat(withSequence(
        withTiming(-3, { duration: 1200, easing: easeIO }),
        withTiming(3, { duration: 1200, easing: easeIO }),
      ), -1, false);
    }

    if (cfg.antennaAnim && cfg.antennaDuration) {
      const aDur = cfg.antennaDuration;
      antennaRotate.value = withRepeat(withSequence(
        withTiming(-4, { duration: aDur / 2, easing: easeIO }),
        withTiming(4, { duration: aDur / 2, easing: easeIO }),
      ), -1, false);
    }

    if (cfg.glow !== 'off') {
      const glowDur = cfg.glow === 'on' ? 2400 : 4000;
      glowScale.value = withRepeat(withSequence(
        withTiming(cfg.glow === 'on' ? 1.08 : 1.04, { duration: glowDur / 2, easing: easeIO }),
        withTiming(1, { duration: glowDur / 2, easing: easeIO }),
      ), -1, false);
      glowOpacity.value = withRepeat(withSequence(
        withTiming(cfg.glow === 'on' ? 0.85 : 0.55, { duration: glowDur / 2, easing: easeIO }),
        withTiming(cfg.glow === 'on' ? 0.45 : 0.25, { duration: glowDur / 2, easing: easeIO }),
      ), -1, false);
    }
    // Reanimated shared values and derived config fields are stable for the lifetime of the emotion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotion]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyY.value },
      { rotate: `${bodyRotate.value}deg` },
    ],
  }));

  const antennaStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${antennaRotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const headW = W * 0.78;
  const headH = W * 0.86;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: W, height: W * 1.05, position: 'relative', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* glow */}
      {cfg.glow !== 'off' && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: W * 0.95,
              height: W * 0.95,
              borderRadius: W * 0.475,
              backgroundColor: `${accentColor}55`,
            },
            glowStyle,
          ]}
        />
      )}

      {/* zzz */}
      {cfg.zzz && [0, 1, 2].map(i => (
        <View key={i} style={{ position: 'absolute', right: '12%', top: '14%' }}>
          <Text style={{ fontWeight: '700', fontSize: 22, color: tokens.colors.inkSoft }}>z</Text>
        </View>
      ))}

      <Animated.View
        style={[
          {
            position: 'relative',
            width: headW,
            height: headH,
          },
          bodyStyle,
        ]}
      >
        {/* antenna */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: headW / 2 - 2,
              top: -W * 0.04,
              alignItems: 'center',
            },
            antennaStyle,
          ]}
        >
          <View style={{ width: 4, height: W * 0.13, backgroundColor: bodyDark, borderRadius: 2 }} />
          <View
            style={{
              width: W * 0.13,
              height: W * 0.13,
              borderRadius: W * 0.065,
              backgroundColor: accentColor,
              marginTop: -W * 0.02,
            }}
          />
        </Animated.View>

        {/* head */}
        <View
          style={{
            position: 'absolute',
            top: W * 0.08,
            left: 0,
            right: 0,
            height: W * 0.78,
            borderRadius: headW * 0.46,
            backgroundColor: bodyColor,
            ...tokens.shadows.card,
          }}
        >
          {/* ear blips */}
          {cfg.ear && [0, 1].map(i => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: '42%',
                ...(i ? { right: -W * 0.07 } : { left: -W * 0.07 }),
                width: W * 0.14,
                height: W * 0.14,
                borderRadius: W * 0.07,
                backgroundColor: bodyDark,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '25%',
                  right: '25%',
                  bottom: '25%',
                  borderRadius: 999,
                  backgroundColor: accentColor,
                }}
              />
            </View>
          ))}

          {/* eyes */}
          <Eyes look={cfg.eyes} W={W} />

          {/* cheeks */}
          {cfg.cheek && (
            <>
              <View style={[styles.cheek, { top: '56%', left: '18%' }]} />
              <View style={[styles.cheek, { top: '56%', right: '18%' }]} />
            </>
          )}

          {/* mouth */}
          <Mouth kind={cfg.mouth} W={W} />

          {/* thinking dots */}
          {cfg.dots && (
            <View style={{ position: 'absolute', right: -W * 0.2, top: '8%', flexDirection: 'row', gap: 4, padding: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 14, ...tokens.shadows.card }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.colors.inkSoft }} />
              ))}
            </View>
          )}
        </View>

        {/* arm wave */}
        {cfg.wave && (
          <View
            style={{
              position: 'absolute',
              right: -W * 0.1,
              top: W * 0.35,
              width: W * 0.22,
              height: W * 0.1,
              borderRadius: 999,
              backgroundColor: bodyDark,
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

function Eyes({ look, W }: { look: RobotConfig['eyes']; W: number }) {
  const eyeBase: import('react-native').ViewStyle = {
    position: 'absolute',
    top: '34%',
    width: W * 0.13,
    height: W * 0.16,
    borderRadius: W * 0.08,
    backgroundColor: tokens.colors.bot.eye,
  };

  if (look === 'closed' || look === 'happy') {
    return (
      <Svg style={{ position: 'absolute', top: '38%', left: 0, right: 0 }} width={W * 0.78} height={W * 0.13}>
        <Path d={look === 'closed' ? 'M 5 8 Q 15 2 25 8' : 'M 5 12 Q 15 2 25 12'} stroke={tokens.colors.bot.eye} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={look === 'closed' ? 'M 35 8 Q 45 2 55 8' : 'M 35 12 Q 45 2 55 12'} stroke={tokens.colors.bot.eye} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    );
  }
  if (look === 'up') {
    return (
      <>
        <View style={[eyeBase, { left: '22%', top: '28%' }]} />
        <View style={[eyeBase, { right: '22%', top: '28%' }]} />
      </>
    );
  }
  if (look === 'gentle') {
    return (
      <>
        <View style={[eyeBase, { left: '22%', width: W * 0.11, height: W * 0.13 }]} />
        <View style={[eyeBase, { right: '22%', width: W * 0.11, height: W * 0.13 }]} />
      </>
    );
  }
  if (look === 'curious') {
    return (
      <>
        <View style={[eyeBase, { left: '20%', width: W * 0.14, height: W * 0.18 }]} />
        <View style={[eyeBase, { right: '20%', width: W * 0.14, height: W * 0.18 }]} />
      </>
    );
  }
  return (
    <>
      <View style={[eyeBase, { left: '22%' }]} />
      <View style={[eyeBase, { right: '22%' }]} />
    </>
  );
}

function Mouth({ kind, W }: { kind: RobotConfig['mouth']; W: number }) {
  const mouthW = W * 0.38;
  const mouthBase: import('react-native').ViewStyle = {
    position: 'absolute',
    bottom: '20%',
    left: '31%',
    width: mouthW,
    height: W * 0.06,
    borderRadius: 999,
  };

  if (kind === 'smile' || kind === 'smile-soft' || kind === 'open-smile' || kind === 'big-smile') {
    return (
      <View style={[mouthBase, { backgroundColor: tokens.colors.bot.eye, height: W * 0.07, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
    );
  }
  if (kind === 'talk') {
    return (
      <View style={[mouthBase, { backgroundColor: tokens.colors.bot.eye, height: W * 0.09 }]} />
    );
  }
  if (kind === 'tiny' || kind === 'tiny-o') {
    return (
      <View style={[mouthBase, { width: W * 0.12, left: '44%', height: W * 0.06, backgroundColor: tokens.colors.bot.eye }]} />
    );
  }
  if (kind === 'frown-soft') {
    return (
      <View style={[mouthBase, { backgroundColor: tokens.colors.bot.eye, borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]} />
    );
  }
  return (
    <View style={[mouthBase, { backgroundColor: tokens.colors.bot.eye, height: W * 0.04 }]} />
  );
}

const styles = StyleSheet.create({
  cheek: {
    position: 'absolute',
    width: 22,
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.colors.bot.cheek,
    opacity: 0.7,
  },
});

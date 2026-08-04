import React, { useEffect } from 'react';
import { type ImageSourcePropType, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tokens } from '@/design-system/tokens';
import { Text } from '@/design-system/primitives/Text';
import { useAppLanguage } from '@/services/i18n/i18n';

export const ROBOT_EMOTES = [
  'idle', 'happy', 'greet', 'listen', 'think', 'speak',
  'success', 'gentle', 'curious', 'sleep', 'sad', 'worry',
] as const;

type RobotEmotion = typeof ROBOT_EMOTES[number];

interface RobotConfig {
  bodyAnim: 'bob' | 'bobStrong' | 'tilt' | 'think' | 'none';
  bobDuration?: number;
  glow: 'on' | 'soft' | 'off';
  zzz?: boolean;
  pose: ImageSourcePropType;
}

// The white cat-eared TeeBot with the black LCD face (source of truth per
// 2026-07-04 direction; master art lives in TbotREAL
// docs/lesson-library/assets/robot-alive/poses). One photographic pose per
// emotion so different screens naturally show different robot pictures.
const POSES = {
  idle: require('../../../assets/mascot/alive-idle.png') as ImageSourcePropType,
  wave: require('../../../assets/mascot/alive-wave.png') as ImageSourcePropType,
  celebrate: require('../../../assets/mascot/alive-celebrate.png') as ImageSourcePropType,
  listening: require('../../../assets/mascot/alive-listening.png') as ImageSourcePropType,
  teach: require('../../../assets/mascot/alive-teach.png') as ImageSourcePropType,
  thinking: require('../../../assets/mascot/alive-thinking.png') as ImageSourcePropType,
  cards: require('../../../assets/mascot/alive-cards.png') as ImageSourcePropType,
  side: require('../../../assets/mascot/alive-side.png') as ImageSourcePropType,
} as const;

const CONFIGS: Record<RobotEmotion, RobotConfig> = {
  idle:    { bodyAnim: 'bob',       bobDuration: 3600, glow: 'soft', pose: POSES.idle },
  happy:   { bodyAnim: 'bob',       bobDuration: 2400, glow: 'soft', pose: POSES.celebrate },
  greet:   { bodyAnim: 'bobStrong',                    glow: 'on',   pose: POSES.wave },
  listen:  { bodyAnim: 'tilt',                         glow: 'on',   pose: POSES.listening },
  think:   { bodyAnim: 'think',                        glow: 'on',   pose: POSES.thinking },
  speak:   { bodyAnim: 'bob',       bobDuration: 2000, glow: 'on',   pose: POSES.teach },
  success: { bodyAnim: 'bobStrong',                    glow: 'on',   pose: POSES.celebrate },
  gentle:  { bodyAnim: 'bob',       bobDuration: 3000, glow: 'soft', pose: POSES.idle },
  curious: { bodyAnim: 'tilt',                         glow: 'soft', pose: POSES.cards },
  sleep:   { bodyAnim: 'bob',       bobDuration: 5000, glow: 'off',  pose: POSES.side, zzz: true },
  sad:     { bodyAnim: 'none',                         glow: 'off',  pose: POSES.thinking },
  worry:   { bodyAnim: 'tilt',                         glow: 'soft', pose: POSES.thinking },
};

interface RobotProps {
  emotion?: RobotEmotion;
  size?: number;
  color?: string;
  accent?: string;
  accessibilityLabel?: string;
  reduceMotion?: boolean;
}

export default function Robot({ emotion = 'idle', size = 220, accessibilityLabel, reduceMotion = false }: RobotProps) {
  const { t } = useAppLanguage();
  const cfg = CONFIGS[emotion] ?? CONFIGS.idle;
  const W = size;
  // Brand consistency: every screen shows the one white cat-eared TeeBot, so
  // the per-screen `accent`/`color` props only tint the ambient glow.
  const accentColor = tokens.colors.coral;

  const bodyY = useSharedValue(0);
  const bodyRotate = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(cfg.glow === 'on' ? 0.45 : 0.25);

  useEffect(() => {
    const dur = cfg.bobDuration ?? 1600;
    const easeIO = Easing.inOut(Easing.ease);

    bodyY.value = 0;
    bodyRotate.value = 0;

    if (reduceMotion) {
      glowOpacity.value = cfg.glow === 'on' ? 0.45 : 0.25;
      glowScale.value = 1;
      return;
    }

    if (cfg.bodyAnim === 'bob') {
      bodyY.value = withRepeat(withSequence(
        withTiming(-6, { duration: dur / 2, easing: easeIO }),
        withTiming(0, { duration: dur / 2, easing: easeIO }),
      ), -1, false);
    } else if (cfg.bodyAnim === 'bobStrong') {
      bodyY.value = withRepeat(withSequence(
        withTiming(-12, { duration: 800, easing: easeIO }),
        withTiming(0, { duration: 800, easing: easeIO }),
      ), -1, false);
      bodyRotate.value = withRepeat(withSequence(
        withTiming(-1, { duration: 800, easing: easeIO }),
        withTiming(1, { duration: 800, easing: easeIO }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation re-runs only on emotion/reduceMotion change; cfg derives from emotion and shared values are stable refs
  }, [emotion, reduceMotion]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyY.value },
      { rotate: `${bodyRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel == null ? undefined : t(accessibilityLabel)}
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

      <Animated.Image
        source={cfg.pose}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        style={[
          { width: W, height: W * 1.05 },
          bodyStyle,
        ]}
      />
    </View>
  );
}

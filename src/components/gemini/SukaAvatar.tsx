import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import type { VoiceState } from '../../state/voiceAssistantStore';
import { useVoiceAssistantStore } from '../../state/voiceAssistantStore';
import { ParticleEffect } from './ParticleEffect';

// ── Design tokens ────────────────────────────────────────────────────
const AVATAR_SIZE = 180;
const GLOW_SIZE = AVATAR_SIZE + 40;
const EYE_W = 18;
const EYE_H = 22;

const C = {
  head: '#E9D5FF',
  headInner: '#DDD6FE',
  glow: '#8B5CF6',
  eye: '#374151',
  eyeHighlight: '#FFFFFF',
  eyeSparkle: '#FFFFFF',
  mouth: '#6B21A8',
  mouthOpen: '#7C3AED',
  cheek: '#FBCFE8',
  bg: 'transparent',
};

// ── Expression config ───────────────────────────────────────────────
interface Expression {
  eyeScaleY: number;
  eyeOffsetY: number;
  mouthWidth: number;
  mouthHeight: number;
  mouthBorderRadius: number;
  mouthCurve: 'smile' | 'neutral' | 'open' | 'sad';
  glowOpacity: number;
  glowPulse: boolean;
  cheekOpacity: number;
}

const EXPRESSIONS: Record<string, Expression> = {
  // Core states
  idle:        { eyeScaleY: 1,    eyeOffsetY: 0,  mouthWidth: 28, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.15, glowPulse: false, cheekOpacity: 0.3 },
  listening:   { eyeScaleY: 1.25, eyeOffsetY: 0,  mouthWidth: 22, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.35, glowPulse: false, cheekOpacity: 0.5 },
  streaming:   { eyeScaleY: 1.2,  eyeOffsetY: 0,  mouthWidth: 20, mouthHeight: 12, mouthBorderRadius: 10, mouthCurve: 'open',    glowOpacity: 0.35, glowPulse: false, cheekOpacity: 0.3 },
  thinking:    { eyeScaleY: 0.9,  eyeOffsetY: -3, mouthWidth: 16, mouthHeight: 14, mouthBorderRadius: 8,  mouthCurve: 'open',    glowOpacity: 0.25, glowPulse: true,  cheekOpacity: 0.2 },
  speaking:    { eyeScaleY: 1,    eyeOffsetY: 0,  mouthWidth: 26, mouthHeight: 16, mouthBorderRadius: 13, mouthCurve: 'open',    glowOpacity: 0.4,  glowPulse: false, cheekOpacity: 0.5 },
  connecting:  { eyeScaleY: 1,    eyeOffsetY: 0,  mouthWidth: 24, mouthHeight: 3,  mouthBorderRadius: 2,  mouthCurve: 'neutral', glowOpacity: 0.3,  glowPulse: true,  cheekOpacity: 0.2 },
  interrupted: { eyeScaleY: 1.3,  eyeOffsetY: 0,  mouthWidth: 18, mouthHeight: 10, mouthBorderRadius: 9,  mouthCurve: 'open',    glowOpacity: 0.2,  glowPulse: false, cheekOpacity: 0.2 },
  blink:       { eyeScaleY: 0.08, eyeOffsetY: 0,  mouthWidth: 28, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.15, glowPulse: false, cheekOpacity: 0.3 },
  // Emotion states
  happy:       { eyeScaleY: 0.6,  eyeOffsetY: 0,  mouthWidth: 34, mouthHeight: 6,  mouthBorderRadius: 3,  mouthCurve: 'smile',   glowOpacity: 0.35, glowPulse: false, cheekOpacity: 0.7 },
  sad:         { eyeScaleY: 0.8,  eyeOffsetY: 2,  mouthWidth: 22, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'sad',     glowOpacity: 0.1,  glowPulse: false, cheekOpacity: 0 },
  laugh:       { eyeScaleY: 0.4,  eyeOffsetY: 0,  mouthWidth: 36, mouthHeight: 8,  mouthBorderRadius: 4,  mouthCurve: 'smile',   glowOpacity: 0.4,  glowPulse: false, cheekOpacity: 0.8 },
  shy:         { eyeScaleY: 0.5,  eyeOffsetY: 2,  mouthWidth: 16, mouthHeight: 3,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.15, glowPulse: false, cheekOpacity: 0.9 },
  curious:     { eyeScaleY: 1.3,  eyeOffsetY: -2, mouthWidth: 14, mouthHeight: 8,  mouthBorderRadius: 7,  mouthCurve: 'open',    glowOpacity: 0.3,  glowPulse: false, cheekOpacity: 0.3 },
  celebrating: { eyeScaleY: 0.5,  eyeOffsetY: 0,  mouthWidth: 38, mouthHeight: 10, mouthBorderRadius: 5,  mouthCurve: 'smile',   glowOpacity: 0.5,  glowPulse: true,  cheekOpacity: 0.8 },
  sleepy:      { eyeScaleY: 0.15, eyeOffsetY: 2,  mouthWidth: 18, mouthHeight: 3,  mouthBorderRadius: 2,  mouthCurve: 'neutral', glowOpacity: 0.08, glowPulse: false, cheekOpacity: 0.2 },
};

// Expressions that trigger cute bounce
const BOUNCY_EXPRESSIONS = ['happy', 'celebrating', 'laugh'];
// Expressions that show eye sparkle (includes speaking for always-on liveliness)
const SPARKLE_EXPRESSIONS = ['happy', 'celebrating', 'laugh', 'curious', 'speaking', 'listening'];
// Head tilt angles per expression
const TILT_MAP: Record<string, number> = { curious: 5, shy: -5, thinking: 3, listening: -2 };

function voiceStateToExpression(state: VoiceState): string {
  switch (state) {
    case 'IDLE': return 'idle';
    case 'ENDED': return 'idle';
    case 'PREPARING_AUDIO':
    case 'CONNECTING':
    case 'READY':
    case 'RECONNECTING': return 'connecting';
    case 'LISTENING': return 'listening';
    case 'USER_SPEAKING': return 'streaming';
    case 'USER_SPEECH_FINALIZING': return 'thinking';
    case 'WAITING_AI': return 'thinking';
    case 'ASSISTANT_SPEAKING': return 'speaking';
    case 'INTERRUPTED': return 'interrupted';
    case 'ERROR_RECOVERABLE':
    case 'ERROR_FATAL': return 'sad';
    default: return 'idle';
  }
}

// ── Component ────────────────────────────────────────────────────────
interface SukaAvatarProps {
  voiceState: VoiceState;
  audioLevel: number;
}

export function SukaAvatar({ voiceState, audioLevel }: SukaAvatarProps) {
  // Expression override from action tags (presentation-only)
  const expressionOverride = useVoiceAssistantStore((s) => s.expressionOverride);
  // Subtle buffering cue while speaking (plan §2.7). UI flag only; does not
  // change the FSM-driven expression.
  const isBuffering = useVoiceAssistantStore((s) => s.isBuffering);
  const expressionKey = expressionOverride ?? voiceStateToExpression(voiceState);
  const expr = EXPRESSIONS[expressionKey] ?? EXPRESSIONS.idle;

  // ── Animated values ──────────────────────────────────────────────
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const eyeScaleY = useRef(new Animated.Value(expr.eyeScaleY)).current;
  const eyeOffsetY = useRef(new Animated.Value(expr.eyeOffsetY)).current;
  const mouthHeight = useRef(new Animated.Value(expr.mouthHeight)).current;
  const mouthWidth = useRef(new Animated.Value(expr.mouthWidth)).current;
  const glowOpacity = useRef(new Animated.Value(expr.glowOpacity)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const cheekOpacity = useRef(new Animated.Value(expr.cheekOpacity)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const headTilt = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // ── Idle breathing loop ──────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.018, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheAnim]);

  // ── Periodic blink ───────────────────────────────────────────────
  useEffect(() => {
    if (voiceState === 'ERROR_RECOVERABLE' || voiceState === 'ERROR_FATAL') return;
    let timeout: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      Animated.sequence([
        Animated.timing(eyeScaleY, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(eyeScaleY, { toValue: expr.eyeScaleY, duration: 120, useNativeDriver: true }),
      ]).start();
      // Blink scheduling is presentation-only animation — does not
      // affect the voice FSM. Plan v2 §11.7 ban targets FSM-affecting
      // timers; this is the documented carve-out.
      // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
      timeout = setTimeout(doBlink, 3000 + Math.random() * 3000);
    };
    // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
    timeout = setTimeout(doBlink, 2000 + Math.random() * 2000);
    return () => clearTimeout(timeout);
  }, [voiceState, expr.eyeScaleY, eyeScaleY]);

  // ── Expression transitions ───────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(eyeScaleY, { toValue: expr.eyeScaleY, useNativeDriver: true, friction: 5 }),
      Animated.spring(eyeOffsetY, { toValue: expr.eyeOffsetY, useNativeDriver: true, friction: 5 }),
      Animated.timing(mouthHeight, { toValue: expr.mouthHeight, duration: 150, useNativeDriver: false }),
      Animated.timing(mouthWidth, { toValue: expr.mouthWidth, duration: 150, useNativeDriver: false }),
      Animated.timing(glowOpacity, { toValue: expr.glowOpacity, duration: 200, useNativeDriver: true }),
      Animated.timing(cheekOpacity, { toValue: expr.cheekOpacity, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [expressionKey, expr, eyeScaleY, eyeOffsetY, mouthHeight, mouthWidth, glowOpacity, cheekOpacity]);

  // ── Glow pulse for connecting/celebrating states ─────────────────
  useEffect(() => {
    if (expr.glowPulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      glowScale.setValue(1);
    }
  }, [expr.glowPulse, glowScale]);

  // ── Speaking: mouth + glow follow audio level ────────────────────
  // While the playback service is refilling after an underrun, dim the glow
  // by ~15% to communicate "catching breath" without alarming the user.
  // Mouth animation is left untouched so the avatar still appears lively.
  useEffect(() => {
    if (expressionKey === 'speaking') {
      const dim = isBuffering ? 0.85 : 1;
      const targetMouth = 8 + audioLevel * 20;
      const targetGlow = (0.25 + audioLevel * 0.3) * dim;
      Animated.parallel([
        Animated.spring(mouthHeight, { toValue: targetMouth, useNativeDriver: false, friction: 6, tension: 120 }),
        Animated.timing(glowOpacity, { toValue: targetGlow, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [audioLevel, expressionKey, isBuffering, mouthHeight, glowOpacity]);

  // ── Cute bounce for happy/celebrating/laugh ──────────────────────
  useEffect(() => {
    if (BOUNCY_EXPRESSIONS.includes(expressionKey)) {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      );
      bounce.start();
      return () => bounce.stop();
    } else if (expressionKey === 'listening') {
      const sway = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -3, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 3, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      sway.start();
      return () => sway.stop();
    } else {
      bounceAnim.setValue(0);
    }
  }, [expressionKey, bounceAnim]);

  // ── Head tilt for curious/shy ────────────────────────────────────
  useEffect(() => {
    const target = TILT_MAP[expressionKey] ?? 0;
    Animated.spring(headTilt, { toValue: target, useNativeDriver: true, friction: 8 }).start();
  }, [expressionKey, headTilt]);

  // ── Eye sparkle for happy states ─────────────────────────────────
  useEffect(() => {
    if (SPARKLE_EXPRESSIONS.includes(expressionKey)) {
      const sparkle = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(sparkleOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );
      sparkle.start();
      return () => sparkle.stop();
    } else {
      sparkleOpacity.setValue(0);
    }
  }, [expressionKey, sparkleOpacity]);

  // ── Mouth style (curve direction) ───────────────────────────────
  const getMouthStyle = () => {
    const base = {
      backgroundColor: expr.mouthCurve === 'open' ? C.mouthOpen : C.mouth,
    };
    if (expr.mouthCurve === 'smile') {
      return { ...base, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 };
    }
    if (expr.mouthCurve === 'sad') {
      return { ...base, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
    }
    if (expr.mouthCurve === 'open') {
      return { ...base, borderRadius: expr.mouthBorderRadius };
    }
    return { ...base, borderRadius: 2 };
  };

  const headRotation = headTilt.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Celebrating particles */}
      <ParticleEffect active={expressionKey === 'celebrating'} />

      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Head with breathing + bounce + tilt */}
      <Animated.View
        style={[
          styles.head,
          {
            transform: [
              { scale: breatheAnim },
              { translateY: bounceAnim },
              { rotate: headRotation },
            ],
          },
        ]}
      >
        {/* Inner highlight */}
        <View style={styles.headInner} />

        {/* Eyes container */}
        <Animated.View style={[styles.eyesRow, { transform: [{ translateY: eyeOffsetY }] }]}>
          {/* Left eye */}
          <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
            {/* Sparkle */}
            <Animated.View style={[styles.eyeSparkle, { opacity: sparkleOpacity }]} />
          </Animated.View>
          {/* Right eye */}
          <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
            {/* Sparkle */}
            <Animated.View style={[styles.eyeSparkle, { opacity: sparkleOpacity }]} />
          </Animated.View>
        </Animated.View>

        {/* Cheeks */}
        <Animated.View style={[styles.cheekLeft, { opacity: cheekOpacity }]} />
        <Animated.View style={[styles.cheekRight, { opacity: cheekOpacity }]} />

        {/* Mouth */}
        <Animated.View
          style={[
            styles.mouth,
            getMouthStyle(),
            {
              width: mouthWidth as unknown as number,
              height: mouthHeight as unknown as number,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: C.glow,
  },
  head: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: C.head,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: C.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headInner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: AVATAR_SIZE * 0.45,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: C.headInner,
    opacity: 0.5,
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: -10,
  },
  eye: {
    width: EYE_W,
    height: EYE_H,
    borderRadius: EYE_W / 2,
    backgroundColor: C.eye,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  eyeHighlight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.eyeHighlight,
  },
  eyeSparkle: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.eyeSparkle,
  },
  cheekLeft: {
    position: 'absolute',
    left: AVATAR_SIZE * 0.15,
    top: AVATAR_SIZE * 0.55,
    width: 22,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.cheek,
  },
  cheekRight: {
    position: 'absolute',
    right: AVATAR_SIZE * 0.15,
    top: AVATAR_SIZE * 0.55,
    width: 22,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.cheek,
  },
  mouth: {
    marginTop: 12,
    alignSelf: 'center',
  },
});

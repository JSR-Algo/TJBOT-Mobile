import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import type { VoiceState } from '../../state/voiceAssistantStore';

// ── Design tokens ────────────────────────────────────────────────────
const AVATAR_SIZE = 180;
const GLOW_SIZE = AVATAR_SIZE + 40;
const EYE_W = 18;
const EYE_H = 22;
const MOUTH_W = 32;

const C = {
  head: '#E9D5FF',
  headInner: '#DDD6FE',
  glow: '#8B5CF6',
  eye: '#374151',
  eyeHighlight: '#FFFFFF',
  mouth: '#6B21A8',
  mouthOpen: '#7C3AED',
  cheek: '#FBCFE8',
  error: '#FCA5A5',
  bg: 'transparent',
};

// ── Expression config per VoiceState ─────────────────────────────────
interface Expression {
  eyeScaleY: number;       // 1 = normal, 0.1 = blink/closed, 1.3 = wide
  eyeOffsetY: number;      // shift eyes up (thinking)
  mouthWidth: number;      // relative width
  mouthHeight: number;     // 0 = line, 1 = full open
  mouthBorderRadius: number;
  mouthCurve: 'smile' | 'neutral' | 'open' | 'sad';
  glowOpacity: number;
  glowPulse: boolean;
  cheekOpacity: number;
}

const EXPRESSIONS: Record<string, Expression> = {
  idle:       { eyeScaleY: 1,   eyeOffsetY: 0, mouthWidth: 28, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.15, glowPulse: false, cheekOpacity: 0.3 },
  listening:  { eyeScaleY: 1.2, eyeOffsetY: 0, mouthWidth: 24, mouthHeight: 3,  mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.3,  glowPulse: false, cheekOpacity: 0.4 },
  streaming:  { eyeScaleY: 1.2, eyeOffsetY: 0, mouthWidth: 20, mouthHeight: 12, mouthBorderRadius: 10, mouthCurve: 'open',    glowOpacity: 0.35, glowPulse: false, cheekOpacity: 0.3 },
  thinking:   { eyeScaleY: 0.9, eyeOffsetY: -3, mouthWidth: 16, mouthHeight: 14, mouthBorderRadius: 8, mouthCurve: 'open',    glowOpacity: 0.25, glowPulse: true,  cheekOpacity: 0.2 },
  speaking:   { eyeScaleY: 1,   eyeOffsetY: 0, mouthWidth: 26, mouthHeight: 16, mouthBorderRadius: 13, mouthCurve: 'open',    glowOpacity: 0.4,  glowPulse: false, cheekOpacity: 0.5 },
  happy:      { eyeScaleY: 0.6, eyeOffsetY: 0, mouthWidth: 34, mouthHeight: 6,  mouthBorderRadius: 3,  mouthCurve: 'smile',   glowOpacity: 0.35, glowPulse: false, cheekOpacity: 0.7 },
  sad:        { eyeScaleY: 0.8, eyeOffsetY: 2, mouthWidth: 22, mouthHeight: 4,  mouthBorderRadius: 2,  mouthCurve: 'sad',     glowOpacity: 0.1,  glowPulse: false, cheekOpacity: 0 },
  connecting:  { eyeScaleY: 1,   eyeOffsetY: 0, mouthWidth: 24, mouthHeight: 3,  mouthBorderRadius: 2,  mouthCurve: 'neutral', glowOpacity: 0.3,  glowPulse: true,  cheekOpacity: 0.2 },
  interrupted: { eyeScaleY: 1.3, eyeOffsetY: 0, mouthWidth: 18, mouthHeight: 10, mouthBorderRadius: 9,  mouthCurve: 'open',    glowOpacity: 0.2,  glowPulse: false, cheekOpacity: 0.2 },
  blink:       { eyeScaleY: 0.08, eyeOffsetY: 0, mouthWidth: 28, mouthHeight: 4, mouthBorderRadius: 2,  mouthCurve: 'smile',   glowOpacity: 0.15, glowPulse: false, cheekOpacity: 0.3 },
};

function voiceStateToExpression(state: VoiceState): string {
  switch (state) {
    case 'IDLE': return 'idle';
    case 'REQUESTING_MIC_PERMISSION':
    case 'CONNECTING':
    case 'RECONNECTING': return 'connecting';
    case 'LISTENING': return 'listening';
    case 'STREAMING_INPUT': return 'streaming';
    case 'WAITING_AI': return 'thinking';
    case 'PLAYING_AI_AUDIO': return 'speaking';
    case 'INTERRUPTED': return 'interrupted';
    case 'ERROR': return 'sad';
    default: return 'idle';
  }
}

// ── Component ────────────────────────────────────────────────────────
interface SukaAvatarProps {
  voiceState: VoiceState;
  audioLevel: number;
}

export function SukaAvatar({ voiceState, audioLevel }: SukaAvatarProps) {
  const expressionKey = voiceStateToExpression(voiceState);
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
    if (voiceState === 'ERROR') return;
    let timeout: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      Animated.sequence([
        Animated.timing(eyeScaleY, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(eyeScaleY, { toValue: expr.eyeScaleY, duration: 120, useNativeDriver: true }),
      ]).start();
      timeout = setTimeout(doBlink, 3000 + Math.random() * 3000);
    };
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

  // ── Glow pulse for connecting states ─────────────────────────────
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

  // ── Speaking: mouth follows audio level ──────────────────────────
  useEffect(() => {
    if (expressionKey === 'speaking') {
      const targetMouth = 8 + audioLevel * 20;
      const targetGlow = 0.25 + audioLevel * 0.3;
      Animated.parallel([
        Animated.spring(mouthHeight, { toValue: targetMouth, useNativeDriver: false, friction: 6, tension: 120 }),
        Animated.timing(glowOpacity, { toValue: targetGlow, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [audioLevel, expressionKey, mouthHeight, glowOpacity]);

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

  return (
    <View style={styles.wrapper}>
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

      {/* Head with breathing */}
      <Animated.View style={[styles.head, { transform: [{ scale: breatheAnim }] }]}>
        {/* Inner highlight */}
        <View style={styles.headInner} />

        {/* Eyes container */}
        <Animated.View style={[styles.eyesRow, { transform: [{ translateY: eyeOffsetY }] }]}>
          {/* Left eye */}
          <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
          </Animated.View>
          {/* Right eye */}
          <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
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

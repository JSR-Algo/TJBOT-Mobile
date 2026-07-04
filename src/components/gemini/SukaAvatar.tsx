import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { VoiceState } from '../../state/voiceAssistantStore';
import { useVoiceAssistantStore } from '../../state/voiceAssistantStore';
import { ParticleEffect } from './ParticleEffect';

const AVATAR_SIZE = 180;
const GLOW_SIZE = AVATAR_SIZE + 40;

const C = {
  head: '#E9D5FF',
  headInner: '#DDD6FE',
  glow: '#8B5CF6',
  eye: '#374151',
  eyeHighlight: '#FFFFFF',
  mouth: '#6B21A8',
  mouthOpen: '#7C3AED',
  cheek: '#FBCFE8',
};

type ExpressionKey =
  | 'idle'
  | 'listening'
  | 'streaming'
  | 'thinking'
  | 'speaking'
  | 'connecting'
  | 'interrupted'
  | 'happy'
  | 'sad'
  | 'celebrating';

function voiceStateToExpression(state: VoiceState): ExpressionKey {
  switch (state) {
    case 'IDLE':
    case 'ENDED':
      return 'idle';
    case 'PREPARING_AUDIO':
    case 'CONNECTING':
    case 'READY':
    case 'RECONNECTING':
      return 'connecting';
    case 'LISTENING':
      return 'listening';
    case 'USER_SPEAKING':
      return 'streaming';
    case 'USER_SPEECH_FINALIZING':
    case 'WAITING_AI':
      return 'thinking';
    case 'ASSISTANT_SPEAKING':
      return 'speaking';
    case 'INTERRUPTED':
      return 'interrupted';
    case 'ERROR_RECOVERABLE':
    case 'ERROR_FATAL':
      return 'sad';
    default:
      return 'idle';
  }
}

interface SukaAvatarProps {
  voiceState: VoiceState;
  audioLevel: number;
  reduceMotion?: boolean;
}

export function SukaAvatar({ voiceState, audioLevel, reduceMotion = false }: SukaAvatarProps) {
  const expressionOverride = useVoiceAssistantStore((s) => s.expressionOverride);
  const expressionKey = (expressionOverride ?? voiceStateToExpression(voiceState)) as ExpressionKey;
  const speaking = expressionKey === 'speaking';
  const happy = expressionKey === 'happy' || expressionKey === 'celebrating';
  const sad = expressionKey === 'sad';
  const mouthHeight = speaking ? 8 + audioLevel * 18 : happy ? 7 : sad ? 4 : 5;
  const mouthWidth = speaking ? 28 : happy ? 38 : sad ? 22 : 26;
  const eyeScaleY = sad ? 0.75 : happy ? 0.62 : expressionKey === 'listening' ? 1.18 : 1;
  const glowOpacity = reduceMotion ? 0.16 : speaking ? 0.42 : expressionKey === 'connecting' ? 0.3 : 0.2;

  return (
    <View style={styles.wrapper} accessibilityLabel={speaking ? 'Suka is speaking' : 'Suka avatar'}>
      <ParticleEffect active={expressionKey === 'celebrating'} reduceMotion={reduceMotion} />
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      <Animated.View style={styles.head}>
        <View style={styles.headInner} />
        <View style={styles.eyesRow}>
          <View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
          </View>
          <View style={[styles.eye, { transform: [{ scaleY: eyeScaleY }] }]}>
            <View style={styles.eyeHighlight} />
          </View>
        </View>
        <View style={styles.cheekLeft} />
        <View style={styles.cheekRight} />
        <Animated.View
          style={[
            styles.mouth,
            {
              width: mouthWidth,
              height: mouthHeight,
              backgroundColor: speaking ? C.mouthOpen : C.mouth,
              borderTopLeftRadius: sad ? 16 : 0,
              borderTopRightRadius: sad ? 16 : 0,
              borderBottomLeftRadius: sad ? 0 : 16,
              borderBottomRightRadius: sad ? 0 : 16,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

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
    width: 18,
    height: 22,
    borderRadius: 9,
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
    marginTop: 24,
  },
});

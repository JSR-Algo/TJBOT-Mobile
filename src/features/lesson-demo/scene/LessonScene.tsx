import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import ClayRobotScreen from '@/components/ClayRobotScreen';
import { colors, radius, spacing, typography } from '../../../theme';
import type { LessonSession, LessonStep } from '../types';
import { resolveLessonSceneScript, type LessonSceneScript } from './lessonSceneScript';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

interface LessonSceneProps {
  lesson: LessonSession;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  reducedMotion?: boolean;
  __disableAnimations?: boolean;
}

export function LessonScene({
  lesson,
  step,
  stepIndex,
  totalSteps,
  reducedMotion = false,
  __disableAnimations = false,
}: LessonSceneProps): React.JSX.Element {
  const { language } = useAppLanguage();
  const script = useMemo(
    () => resolveLessonSceneScript({ lesson, step, stepIndex, totalSteps, reducedMotion }),
    [lesson, reducedMotion, step, stepIndex, totalSteps],
  );
  const push = useRef(new Animated.Value(0)).current;
  const sunPulse = useRef(new Animated.Value(script.sunnyGlow ? 1 : 0)).current;
  const petReveal = useRef(new Animated.Value(script.petPose === 'pop-out' ? 1 : 0)).current;

  useEffect(() => {
    if (__disableAnimations || reducedMotion) {
      push.setValue(script.cameraPush ? 1 : 0);
      sunPulse.setValue(script.sunnyGlow ? 1 : 0);
      petReveal.setValue(script.petPose === 'pop-out' ? 1 : 0);
      return;
    }

    const animations = [
      Animated.timing(push, {
        toValue: script.cameraPush ? 1 : 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(sunPulse, {
        toValue: script.sunnyGlow ? 1 : 0.25,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.spring(petReveal, {
        toValue: script.petPose === 'pop-out' ? 1 : 0,
        speed: 9,
        bounciness: 7,
        useNativeDriver: true,
      }),
    ];

    Animated.parallel(animations).start();
  }, [__disableAnimations, petReveal, push, reducedMotion, script.cameraPush, script.petPose, script.sunnyGlow, sunPulse]);

  const cameraStyle = {
    transform: [
      {
        scale: push.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.035],
        }),
      },
    ],
  };
  const sunGlowStyle = {
    opacity: sunPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.28, 0.82],
    }),
    transform: [
      {
        scale: sunPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1.08],
        }),
      },
    ],
  };
  const petStyle = {
    opacity: petReveal,
    transform: [
      {
        translateY: petReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
      {
        scale: petReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };

  return (
    <View
      testID="lesson-scene"
      accessibilityLabel={translateTemplate(
        '{{word}} lesson scene',
        { word: script.targetWord },
        { locale: language },
      )}
      style={styles.scene}
    >
      <Animated.View style={[styles.world, cameraStyle]}>
        <View style={styles.sky} />
        <Animated.View
          pointerEvents="none"
          style={[styles.sunGlow, sunGlowStyle]}
          testID={script.sunnyGlow ? 'lesson-scene-sunny-glow' : 'lesson-scene-sunny-soft'}
        />
        <Sun />
        <Cloud style={styles.cloudLeft} />
        <Cloud style={styles.cloudRight} />
        <View style={styles.backHill} />
        <View style={styles.frontHill} />
        <GrassParallax />

        <View style={styles.robotStage}>
          <TeeBotSprite script={script} />
        </View>

        <Animated.View
          testID={script.petPose === 'pop-out' ? 'lesson-scene-pet-pop-out' : 'lesson-scene-pet-hidden'}
          style={[styles.petStage, petStyle]}
        >
          <LeafPet />
        </Animated.View>

        {script.wordCardVisible ? (
          <View style={styles.wordCard} testID="lesson-scene-word-card">
            <Text style={styles.wordText} testID="lesson-scene-word-card-text">
              {script.targetWord}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function Sun(): React.JSX.Element {
  return (
    <View style={styles.sun} testID="lesson-scene-sun">
      <View style={[styles.sunRay, styles.sunRayTop]} />
      <View style={[styles.sunRay, styles.sunRayRight]} />
      <View style={[styles.sunRay, styles.sunRayBottom]} />
      <View style={[styles.sunRay, styles.sunRayLeft]} />
      <View style={styles.sunSmile} />
    </View>
  );
}

function Cloud({ style }: { style: object }): React.JSX.Element {
  return (
    <View style={[styles.cloud, style]}>
      <View style={[styles.cloudPuff, styles.cloudPuffOne]} />
      <View style={[styles.cloudPuff, styles.cloudPuffTwo]} />
      <View style={[styles.cloudPuff, styles.cloudPuffThree]} />
    </View>
  );
}

function GrassParallax(): React.JSX.Element {
  return (
    <View style={styles.grassLayer} pointerEvents="none">
      <View style={[styles.flower, styles.flowerOne]} />
      <View style={[styles.flower, styles.flowerTwo]} />
      <View style={[styles.flower, styles.flowerThree]} />
      <View style={[styles.grassBlade, styles.grassBladeOne]} />
      <View style={[styles.grassBlade, styles.grassBladeTwo]} />
      <View style={[styles.grassBlade, styles.grassBladeThree]} />
    </View>
  );
}

function TeeBotSprite({ script }: { script: LessonSceneScript }): React.JSX.Element {
  return (
    <View style={styles.robotWrap} testID={`lesson-scene-teebot-${script.robotPose}`}>
      <ClayRobotScreen
        mood={script.robotPose}
        size={148}
        isSpeaking={script.robotPose === 'point' || script.robotPose === 'wave'}
        testID={`lesson-scene-clay-${script.robotPose}`}
      />
    </View>
  );
}

function LeafPet(): React.JSX.Element {
  return (
    <View style={styles.petBody}>
      <View style={[styles.leaf, styles.leafLeft]} />
      <View style={[styles.leaf, styles.leafRight]} />
      <View style={styles.petFace}>
        <View style={styles.petEye} />
        <View style={styles.petEye} />
        <View style={styles.petMouth} />
      </View>
      <View style={styles.petBelly} />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#B9F0F5',
    backgroundColor: '#70D7F4',
    overflow: 'hidden',
  },
  world: {
    height: 260,
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#70D7F4',
  },
  sunGlow: {
    position: 'absolute',
    right: 22,
    top: 14,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFF3A5',
  },
  sun: {
    position: 'absolute',
    right: 42,
    top: 32,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFD35A',
    borderWidth: 2,
    borderColor: '#FFE797',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunRay: {
    position: 'absolute',
    width: 5,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFD35A',
  },
  sunRayTop: {
    top: -19,
  },
  sunRayRight: {
    right: -15,
    transform: [{ rotate: '90deg' }],
  },
  sunRayBottom: {
    bottom: -19,
  },
  sunRayLeft: {
    left: -15,
    transform: [{ rotate: '90deg' }],
  },
  sunSmile: {
    width: 18,
    height: 9,
    borderBottomWidth: 3,
    borderBottomColor: '#6B4B1F',
    borderRadius: 12,
  },
  cloud: {
    position: 'absolute',
    width: 78,
    height: 38,
  },
  cloudLeft: {
    left: 20,
    top: 28,
  },
  cloudRight: {
    right: 112,
    top: 72,
    transform: [{ scale: 0.74 }],
  },
  cloudPuff: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 999,
  },
  cloudPuffOne: {
    width: 42,
    height: 30,
    left: 0,
    bottom: 0,
  },
  cloudPuffTwo: {
    width: 48,
    height: 36,
    left: 24,
    bottom: 4,
  },
  cloudPuffThree: {
    width: 36,
    height: 28,
    right: 0,
    bottom: 0,
  },
  backHill: {
    position: 'absolute',
    left: -36,
    right: -30,
    bottom: 52,
    height: 86,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: '#8FCF74',
  },
  frontHill: {
    position: 'absolute',
    left: -28,
    right: -26,
    bottom: -28,
    height: 112,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: '#B8DE72',
  },
  grassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  flower: {
    position: 'absolute',
    bottom: 34,
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#FF7C65',
    borderWidth: 3,
    borderColor: '#FFE58A',
  },
  flowerOne: {
    left: 32,
  },
  flowerTwo: {
    right: 108,
    bottom: 42,
    transform: [{ scale: 0.85 }],
  },
  flowerThree: {
    right: 26,
    bottom: 30,
    transform: [{ scale: 0.7 }],
  },
  grassBlade: {
    position: 'absolute',
    bottom: 22,
    width: 4,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#6FBE56',
  },
  grassBladeOne: {
    left: 78,
    transform: [{ rotate: '-16deg' }],
  },
  grassBladeTwo: {
    right: 70,
    transform: [{ rotate: '12deg' }],
  },
  grassBladeThree: {
    right: 164,
    bottom: 18,
    transform: [{ rotate: '-8deg' }],
  },
  robotStage: {
    position: 'absolute',
    left: 32,
    bottom: 22,
  },
  robotWrap: {
    width: 158,
    height: 178,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  petStage: {
    position: 'absolute',
    right: 36,
    bottom: 34,
  },
  petBody: {
    width: 72,
    height: 82,
    borderRadius: 38,
    backgroundColor: '#F0E4C6',
    borderWidth: 2,
    borderColor: '#F8F0D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    position: 'absolute',
    top: -11,
    width: 16,
    height: 25,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#8BB66B',
  },
  leafLeft: {
    left: 25,
    transform: [{ rotate: '-32deg' }],
  },
  leafRight: {
    right: 22,
    transform: [{ rotate: '30deg' }],
  },
  petFace: {
    width: 46,
    height: 30,
    borderRadius: 17,
    backgroundColor: '#AEE6D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  petEye: {
    width: 6,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#255B64',
  },
  petMouth: {
    position: 'absolute',
    bottom: 7,
    width: 8,
    height: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#255B64',
    borderRadius: 6,
  },
  petBelly: {
    position: 'absolute',
    bottom: 9,
    width: 34,
    height: 24,
    borderRadius: 18,
    backgroundColor: '#AEE6D9',
  },
  wordCard: {
    position: 'absolute',
    right: 20,
    bottom: 116,
    minWidth: 104,
    maxWidth: 140,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#28F4F4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  wordText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

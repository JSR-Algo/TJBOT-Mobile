import React, { useEffect } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import ClayRobotScreen from '@/components/ClayRobotScreen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { referenceImages } from '@/design-system/referenceTheme';
import PulseRing from '@/design-system/components/PulseRing';
import { Text } from '@/design-system/primitives';
import type { LessonSession, LessonStep, RobotReadyState } from '../types';

interface FullscreenLessonSceneProps {
  lesson: LessonSession;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  voiceActive?: boolean;
  isSpeaking?: boolean;
}

function voiceRingColor(state: RobotReadyState, isSpeaking: boolean): string {
  if (isSpeaking) return '#FF6B6F';
  if (state === 'listening') return '#4CC9F0';
  if (state === 'celebrating') return '#FFD35A';
  return '#FF6B6F';
}

export function FullscreenLessonScene({
  lesson,
  step,
  stepIndex,
  totalSteps,
  voiceActive = false,
  isSpeaking = false,
}: FullscreenLessonSceneProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const robotSize = Math.min(width * 0.62, height * 0.38, 320);
  const breathe = React.useRef(new Animated.Value(0)).current;
  const media = lesson.media;

  const player = useVideoPlayer(media?.videoSource ?? null, (videoPlayer) => {
    videoPlayer.loop = media?.loop ?? true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    if (!media?.videoSource) return;
    player.loop = media.loop ?? true;
    player.play();
  }, [media?.loop, media?.videoSource, player]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breathe]);

  const robotScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isSpeaking ? 1.04 : 1.02],
  });

  const background = media?.videoSource ? (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  ) : (
    <ImageBackground
      source={media?.posterSource ?? referenceImages.robotHead}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );

  return (
    <View testID="fullscreen-lesson-scene" style={styles.root}>
      {background}
      <View style={styles.scrimTop} pointerEvents="none" />
      <View style={styles.scrimBottom} pointerEvents="none" />

      <View style={styles.promptWrap} pointerEvents="none">
        <Text style={styles.stepMeta}>
          {lesson.title ? `${lesson.title} · ` : ''}Step {stepIndex + 1} of {totalSteps} · {step.title}
        </Text>
        <Text style={styles.prompt}>{step.prompt}</Text>
        {step.helperText ? <Text style={styles.helper}>{step.helperText}</Text> : null}
      </View>

      <View style={[styles.robotStage, { bottom: height * 0.08 }]}>
        {voiceActive ? (
          <View style={[styles.pulseWrap, { width: robotSize + 36, height: robotSize + 36 }]}>
            <PulseRing size={robotSize + 36} color={voiceRingColor(step.robotState, isSpeaking)} />
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ scale: robotScale }] }}>
          <ClayRobotScreen
            mood={step.robotState}
            size={robotSize}
            isSpeaking={isSpeaking}
            testID="fullscreen-clay-robot"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E1A24',
  },
  scrimTop: {
    ...StyleSheet.absoluteFillObject,
    bottom: '55%',
    backgroundColor: 'rgba(8, 18, 28, 0.42)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    backgroundColor: 'rgba(8, 18, 28, 0.28)',
  },
  promptWrap: {
    position: 'absolute',
    top: 72,
    left: 24,
    right: 24,
    gap: 8,
  },
  stepMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  prompt: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  helper: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  robotStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { RobotBody } from '@/components/robot/RobotBody';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { colors, radius, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import type { LessonSession, LessonStep } from '../types';
import { resolveLessonSceneScript } from './lessonSceneScript';

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
  const script = useMemo(
    () => resolveLessonSceneScript({ lesson, step, stepIndex, totalSteps, reducedMotion }),
    [lesson, reducedMotion, step, stepIndex, totalSteps],
  );

  return (
    <Box
      testID="lesson-scene"
      accessibilityLabel={`${script.targetWord} lesson scene`}
      style={styles.scene}
      gap={spacing.md}
    >
      <Box flexDirection="row" alignItems="center" gap={spacing.md}>
        <View style={styles.robotWrap} testID={`lesson-scene-teebot-${script.robotPose}`}>
          <RobotBody
            motion={script.robotMotion}
            bodyColor="#F7F7F1"
            size={126}
            __disableAnimations={__disableAnimations || reducedMotion}
          />
        </View>
        <Box flex={1} gap={spacing.sm}>
          <Text style={styles.sceneLabel}>TeeBot is ready</Text>
          <Text style={styles.sceneTitle}>{lesson.theme}</Text>
          <Text style={styles.sceneCopy}>{step.prompt}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" alignItems="center" gap={spacing.sm}>
        <Box style={styles.wordCard} testID="lesson-scene-word-card">
          <Text style={styles.wordText} testID="lesson-scene-word-card-text">
            {script.targetWord}
          </Text>
        </Box>
        <Box
          testID={script.petPose === 'pop-out' ? 'lesson-scene-pet-pop-out' : 'lesson-scene-pet-hidden'}
          style={[styles.pet, script.petPose === 'pop-out' ? styles.petVisible : styles.petHidden]}
        >
          <Text style={styles.petText}>{script.petPose === 'pop-out' ? 'Leaf friend' : 'Waiting'}</Text>
        </Box>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  robotWrap: {
    width: 132,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneLabel: { ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  sceneTitle: { ...typography.h3, color: colors.textPrimary },
  sceneCopy: { ...typography.body2, color: colors.textSecondary },
  wordCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  wordText: { ...typography.h2, color: colors.primary, textAlign: 'center', fontWeight: '700' },
  pet: {
    minWidth: 96,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  petVisible: { backgroundColor: colors.success },
  petHidden: { backgroundColor: colors.border },
  petText: { ...typography.caption, color: colors.textPrimary, textAlign: 'center', fontWeight: '700' },
});

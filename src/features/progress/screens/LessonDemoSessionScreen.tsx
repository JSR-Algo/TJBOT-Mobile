import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { colors, radius, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { LessonScene, staticLessonContentProvider, useLessonDemoProgressStore, type LessonAgeBand } from '../lesson-demo';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDemoSessionScreen'> & {
  __disableSceneAnimations?: boolean;
};

function stateLabel(state: string): string {
  if (state === 'modeling') return 'TeeBot models';
  if (state === 'listening') return 'TeeBot listens';
  if (state === 'thinking') return 'TeeBot thinks';
  if (state === 'celebrating') return 'TeeBot celebrates';
  return 'TeeBot is ready';
}

export default function LessonDemoSessionScreen({
  navigation,
  route,
  __disableSceneAnimations = false,
}: Props): React.JSX.Element {
  const ageBand: LessonAgeBand = route.params?.ageBand ?? '7-9';
  const requestedWeek = route.params?.week ?? 1;
  const requestedDay = route.params?.day ?? 1;
  const lesson = React.useMemo(
    () => staticLessonContentProvider.getLessonByWeekDay(requestedWeek, requestedDay, ageBand)
      ?? staticLessonContentProvider.getTodaySession(ageBand),
    [ageBand, requestedDay, requestedWeek],
  );
  const [stepIndex, setStepIndex] = React.useState(0);
  const completeLesson = useLessonDemoProgressStore((state) => state.completeLesson);
  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;

  const handleNext = (): void => {
    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }
    void completeLesson(lesson, ageBand);
    navigation.navigate(ROUTES.LessonDemoParentSummaryScreen, { lessonId: lesson.lessonId, ageBand });
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <Text style={styles.status}>{stateLabel(step.robotState)}</Text>
          <Text style={styles.stepCount}>Step {stepIndex + 1} of {lesson.steps.length}</Text>
        </View>

        <View style={styles.lessonHeader}>
          <Text style={styles.theme}>{lesson.theme}</Text>
          <Text style={styles.focus}>{lesson.focusItems.join(' + ')}</Text>
        </View>

        <LessonScene
          lesson={lesson}
          step={step}
          stepIndex={stepIndex}
          totalSteps={lesson.steps.length}
          __disableAnimations={__disableSceneAnimations}
        />

        <View style={styles.practiceCard}>
          <Text style={styles.stepType}>{step.type}</Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.prompt}>{step.prompt}</Text>
          {step.helperText ? <Text style={styles.helper}>{step.helperText}</Text> : null}
          {step.choices ? (
            <View style={styles.choices}>
              {step.choices.map((choice) => (
                <TouchableOpacity key={choice.id} accessibilityRole="button" style={styles.choice}>
                  <Text style={styles.choiceText}>{choice.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Back"
          variant="ghost"
          onPress={() => {
            if (stepIndex > 0) setStepIndex((current) => current - 1);
            else navigation.goBack();
          }}
          style={styles.footerButton}
        />
        <Button label="Repeat" variant="secondary" onPress={() => setStepIndex((current) => current)} style={styles.footerButton} />
        <Button label={isLastStep ? 'Finish' : 'Next'} onPress={handleNext} style={styles.footerButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  status: { ...typography.body2, color: colors.primary, fontWeight: '700' },
  stepCount: { ...typography.body2, color: colors.textSecondary },
  lessonHeader: { gap: spacing.sm },
  theme: { ...typography.h2, color: colors.textPrimary },
  focus: { ...typography.body1, color: colors.textSecondary },
  practiceCard: {
    minHeight: 260,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  stepType: { ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  stepTitle: { ...typography.h1, color: colors.textPrimary },
  prompt: { ...typography.h3, color: colors.textPrimary },
  helper: { ...typography.body1, color: colors.textSecondary },
  choices: { gap: spacing.sm },
  choice: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
  },
  choiceText: { ...typography.body1, color: colors.primaryDark, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  footerButton: { flex: 1, paddingHorizontal: spacing.sm },
});

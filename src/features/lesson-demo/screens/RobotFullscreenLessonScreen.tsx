import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGeminiConversation } from '@/hooks/useGeminiConversation';
import { Text } from '@/design-system/primitives';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useVoiceAssistantStore, type VoiceState } from '@/state/voiceAssistantStore';
import { BARN_SAY_IT_LESSON_ID } from '../content/barnSayItLesson';
import { buildLessonVoicePrompt } from '../lessonVoicePrompt';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';
import { FullscreenLessonScene } from '../scene/FullscreenLessonScene';
import type { LessonAgeBand, LessonSession } from '../types';
import {
  openAppSettings,
  probeVoiceReadiness,
  voiceReadinessMessage,
  type VoiceReadinessIssue,
} from '../voiceReadiness';
import { diagnosticLog } from '@/services/observability/diagnosticLog';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotFullscreenLessonScreen'>;

// Helper: Determine if mic settings button should appear in error banner
function shouldShowMicSettingsAction(readinessIssue: VoiceReadinessIssue): boolean {
  return readinessIssue === 'mic_blocked' || readinessIssue === 'mic_denied';
}

// Helper: Determine if voice is currently active
function isVoiceActive(voiceState: VoiceState): boolean {
  return voiceState !== 'IDLE' && voiceState !== 'ENDED' && voiceState !== 'ERROR_FATAL';
}

// Helper: Determine if robot is speaking
function isSpeaking(voiceState: VoiceState): boolean {
  return voiceState === 'ASSISTANT_SPEAKING' || voiceState === 'WAITING_AI';
}

// Helper: Probe voice readiness and handle auth_missing case
async function probeVoiceAndSetReadiness(
  setReadinessIssue: (issue: VoiceReadinessIssue) => void,
  setVoiceStarted: (started: boolean) => void,
  startConversation: () => void,
): Promise<void> {
  const issue = await probeVoiceReadiness();
  if (issue === 'auth_missing') {
    setReadinessIssue(issue);
    return;
  }
  // Speak-first: never gate the robot's voice on the mic
  setReadinessIssue(issue);
  setVoiceStarted(true);
  void startConversation();
}

// Helper: Compute displayed error message
function getDisplayedError(readinessIssue: VoiceReadinessIssue, voiceError: string | null): string | null {
  const readinessMessage = voiceReadinessMessage(readinessIssue);
  return readinessMessage || voiceError;
}

// Custom hook: Manage lesson step and choice selection state
function useLessonStepState() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [stepIndex]);

  return { stepIndex, setStepIndex, selectedChoiceId, setSelectedChoiceId };
}

// Custom hook: Manage voice state and readiness
function useVoiceState() {
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [readinessIssue, setReadinessIssue] = useState<VoiceReadinessIssue>(null);

  return {
    voiceStarted,
    setVoiceStarted,
    readinessIssue,
    setReadinessIssue,
  };
}

// Custom hook: Extract and memoize lesson from route params
function useLessonFromRoute(
  lessonId: string | undefined,
  ageBand: LessonAgeBand,
  language: AppLocale,
): LessonSession {
  return useMemo(
    () => staticLessonContentProvider.getLessonById(lessonId ?? BARN_SAY_IT_LESSON_ID, ageBand)
      ?? staticLessonContentProvider.getLessonById(BARN_SAY_IT_LESSON_ID, ageBand)!,
    [ageBand, language, lessonId],
  );
}

// Custom hook: Compute voice state indicators
function useVoiceStateIndicators(voiceState: VoiceState) {
  return {
    isSpeakingNow: isSpeaking(voiceState),
    voiceActive: isVoiceActive(voiceState),
  };
}

// Custom hook: Auto-start voice on mount if enabled
function useAutoStartVoice(
  autoStartVoice: boolean,
  voiceStarted: boolean,
  setReadinessIssue: (issue: VoiceReadinessIssue) => void,
  setVoiceStarted: (started: boolean) => void,
  startConversation: () => void,
) {
  useEffect(() => {
    if (!autoStartVoice || voiceStarted) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await probeVoiceAndSetReadiness(setReadinessIssue, setVoiceStarted, startConversation);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoStartVoice, startConversation, voiceStarted, setReadinessIssue, setVoiceStarted]);
}

// Custom hook: Cleanup conversation on unmount
function useCleanupConversationOnUnmount(stopConversation: () => void) {
  useEffect(() => () => {
    stopConversation();
  }, [stopConversation]);
}

// Custom hook: Log diagnostic errors
function useDiagnosticLogging(
  displayedError: string | null,
  lessonId: string,
  stepIndex: number,
  voiceState: VoiceState,
  readinessIssue: VoiceReadinessIssue,
) {
  useEffect(() => {
    if (!displayedError) return;
    diagnosticLog({
      severity: 'error',
      category: 'lesson',
      event: 'robot_lesson_error',
      message: displayedError,
      detail: {
        lessonId,
        stepIndex,
        voiceState,
        readinessIssue,
      },
    });
  }, [displayedError, lessonId, readinessIssue, stepIndex, voiceState]);
}

// Component: Voice icon rendering
function VoiceIcon({ voiceState, voiceActive }: {
  voiceState: VoiceState;
  voiceActive: boolean;
}): React.JSX.Element {
  if (voiceState === 'CONNECTING' || voiceState === 'PREPARING_AUDIO') {
    return <ActivityIndicator color="#FFFFFF" />;
  }
  return <Text style={styles.iconButtonText}>{voiceActive ? '🎙️' : '🤖'}</Text>;
}

// Component: Top bar with exit and voice toggle
function TopBar({
  insets,
  onExit,
  onVoiceToggle,
  voiceActive,
  voiceState,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  onExit: () => void;
  onVoiceToggle: () => void;
  voiceActive: boolean;
  voiceState: VoiceState;
}): React.JSX.Element {
  const { t } = useAppLanguage();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('Close lesson')}
        onPress={onExit}
        style={styles.iconButton}
      >
        <Text style={styles.iconButtonText}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t(voiceActive ? 'Stop talking to Robot' : 'Talk to Robot')}
        onPress={onVoiceToggle}
        style={[styles.iconButton, voiceActive ? styles.iconButtonActive : null]}
      >
        <VoiceIcon voiceState={voiceState} voiceActive={voiceActive} />
      </TouchableOpacity>
    </View>
  );
}

// Component: Lesson choices
function LessonChoices({
  insets,
  step,
  selectedChoiceId,
  onSelectChoice,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  step: LessonSession['steps'][number];
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
}): React.JSX.Element | null {
  const { language } = useAppLanguage();
  if (!step.choices) return null;
  return (
    <View style={[styles.choices, { bottom: insets.bottom + 96 }]}>
      {step.choices.map((choice) => {
        const selected = selectedChoiceId === choice.id;
        return (
          <TouchableOpacity
            key={choice.id}
            accessibilityRole="button"
            accessibilityLabel={translateTemplate(
              'Choose {{choice}}',
              { choice: choice.label },
              { locale: language },
            )}
            onPress={() => onSelectChoice(choice.id)}
            style={[styles.choice, selected ? styles.choiceSelected : null]}
          >
            <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null]}>
              {choice.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Component: AI transcript
function TranscriptDisplay({
  insets,
  aiTranscript,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  aiTranscript: string;
}): React.JSX.Element | null {
  if (!aiTranscript) return null;
  return (
    <View style={[styles.transcript, { bottom: insets.bottom + 168 }]} pointerEvents="none">
      <Text style={styles.transcriptText} numberOfLines={3}>
        {aiTranscript}
      </Text>
    </View>
  );
}

// Component: Error banner
function ErrorBanner({
  insets,
  displayedError,
  readinessIssue,
  onOpenSettings,
  onOpenDiagnosticLog,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  displayedError: string | null;
  readinessIssue: VoiceReadinessIssue;
  onOpenSettings: () => void;
  onOpenDiagnosticLog: () => void;
}): React.JSX.Element | null {
  const { t } = useAppLanguage();
  if (!displayedError) return null;
  return (
    <View style={[styles.errorBanner, { top: insets.top + 64 }]}>
      <Text style={styles.errorText}>{displayedError}</Text>
      {shouldShowMicSettingsAction(readinessIssue) ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Open microphone settings')}
          onPress={onOpenSettings}
          style={styles.errorAction}
        >
          <Text style={styles.errorActionText}>Open Settings</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('Open diagnostic log')}
        onPress={onOpenDiagnosticLog}
        style={styles.errorAction}
      >
        <Text style={styles.errorActionText}>Open diagnostic log</Text>
      </TouchableOpacity>
    </View>
  );
}

// Component: Footer navigation
function FooterNavigation({
  insets,
  stepIndex,
  isLastStep,
  onPrevious,
  onNext,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  stepIndex: number;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
}): React.JSX.Element {
  const { t } = useAppLanguage();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('Previous step')}
        onPress={onPrevious}
        style={[styles.footerButton, stepIndex === 0 ? styles.footerButtonDisabled : null]}
        disabled={stepIndex === 0}
      >
        <Text style={styles.footerButtonText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t(isLastStep ? 'Finish lesson' : 'Next step')}
        onPress={onNext}
        style={[styles.footerButton, styles.footerButtonPrimary]}
      >
        <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
          {isLastStep ? 'Finish' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Handler: Process next step action
function handleNextStepAction(
  isLastStep: boolean,
  completeLesson: (lesson: LessonSession, ageBand: LessonAgeBand) => Promise<void>,
  lesson: LessonSession,
  ageBand: LessonAgeBand,
  stopConversation: () => void,
  navigation: NativeStackScreenProps<RootStackParamList, 'RobotFullscreenLessonScreen'>['navigation'],
  setStepIndex: (fn: (c: number) => number) => void,
): void {
  if (!isLastStep) {
    setStepIndex((c) => c + 1);
    return;
  }
  void completeLesson(lesson, ageBand);
  stopConversation();
  navigation.navigate(ROUTES.ParentLessonSummaryScreen, { lessonId: lesson.lessonId, ageBand });
}

// Handler: Process voice toggle action
function handleVoiceToggleAction(
  voiceActive: boolean,
  stopConversation: () => void,
  setVoiceStarted: (started: boolean) => void,
  setReadinessIssue: (issue: VoiceReadinessIssue) => void,
  startConversation: () => void,
): void {
  if (voiceActive) {
    stopConversation();
    setVoiceStarted(false);
    return;
  }
  void probeVoiceAndSetReadiness(setReadinessIssue, setVoiceStarted, startConversation);
}

// Handler: Go to previous step
function handlePreviousStep(stepIndex: number, setStepIndex: (fn: (c: number) => number) => void): void {
  if (stepIndex > 0) setStepIndex((c) => c - 1);
}


export function RobotFullscreenLessonScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { language } = useAppLanguage();
  const ageBand = (route.params?.ageBand ?? '4-6') as LessonAgeBand;
  const lessonId = route.params?.lessonId;
  const autoStartVoice = route.params?.autoStartVoice ?? true;

  const lesson = useLessonFromRoute(lessonId, ageBand, language);
  const { stepIndex, setStepIndex, selectedChoiceId, setSelectedChoiceId } = useLessonStepState();
  const { voiceStarted, setVoiceStarted, readinessIssue, setReadinessIssue } = useVoiceState();

  const voiceState = useVoiceAssistantStore((state) => state.state);
  const aiTranscript = useVoiceAssistantStore((state) => state.aiTranscript);
  const voiceError = useVoiceAssistantStore((state) => state.error);

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;
  const { isSpeakingNow, voiceActive } = useVoiceStateIndicators(voiceState);

  const systemInstruction = useMemo(
    () => buildLessonVoicePrompt(lesson, stepIndex),
    [lesson, stepIndex],
  );

  const { startConversation, stopConversation } = useGeminiConversation({ systemInstruction });
  const completeLesson = useLessonDemoProgressStore((state) => state.completeLesson);

  useAutoStartVoice(autoStartVoice, voiceStarted, setReadinessIssue, setVoiceStarted, startConversation);
  useCleanupConversationOnUnmount(stopConversation);

  const handleExit = useCallback(
    () => { stopConversation(); navigation.goBack(); },
    [navigation, stopConversation],
  );

  const handlePrevious = useCallback(
    () => { handlePreviousStep(stepIndex, setStepIndex); },
    [stepIndex, setStepIndex],
  );

  const handleNext = useCallback(
    () => { handleNextStepAction(isLastStep, completeLesson, lesson, ageBand, stopConversation, navigation, setStepIndex); },
    [ageBand, completeLesson, isLastStep, lesson, navigation, stopConversation, setStepIndex],
  );

  const handleVoiceToggle = useCallback(
    () => { handleVoiceToggleAction(voiceActive, stopConversation, setVoiceStarted, setReadinessIssue, startConversation); },
    [startConversation, stopConversation, voiceActive, setReadinessIssue, setVoiceStarted],
  );

  const displayedError = getDisplayedError(readinessIssue, voiceError);

  useDiagnosticLogging(displayedError, lesson.lessonId, stepIndex, voiceState, readinessIssue);

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      <FullscreenLessonScene
        lesson={lesson}
        step={step}
        stepIndex={stepIndex}
        totalSteps={lesson.steps.length}
        voiceActive={voiceActive}
        isSpeaking={isSpeakingNow}
      />

      <TopBar
        insets={insets}
        onExit={handleExit}
        onVoiceToggle={handleVoiceToggle}
        voiceActive={voiceActive}
        voiceState={voiceState}
      />

      <LessonChoices
        insets={insets}
        step={step}
        selectedChoiceId={selectedChoiceId}
        onSelectChoice={setSelectedChoiceId}
      />

      <TranscriptDisplay
        insets={insets}
        aiTranscript={aiTranscript}
      />

      <ErrorBanner
        insets={insets}
        displayedError={displayedError}
        readinessIssue={readinessIssue}
        onOpenSettings={openAppSettings}
        onOpenDiagnosticLog={() => navigation.navigate(ROUTES.ParentDiagnosticLogScreen)}
      />

      <FooterNavigation
        insets={insets}
        stepIndex={stepIndex}
        isLastStep={isLastStep}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </View>
  );
}

export default RobotFullscreenLessonScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,107,111,0.72)',
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  choices: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 10,
  },
  choice: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  choiceSelected: {
    borderColor: '#FF6B6F',
    backgroundColor: 'rgba(255,107,111,0.82)',
  },
  choiceText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  transcript: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  transcriptText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(120, 24, 24, 0.82)',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorAction: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  errorActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
  },
  footerButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerButtonDisabled: {
    opacity: 0.35,
  },
  footerButtonPrimary: {
    backgroundColor: '#FF6B6F',
    borderColor: '#FF6B6F',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerButtonTextPrimary: {
    color: '#FFFFFF',
  },
});
